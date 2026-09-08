const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');
const { EventEmitter } = require('node:events');
const { shell, Notification } = require('electron');

class DownloadEngine extends EventEmitter {
  constructor(userDataPath, defaultDownloadPath) {
    super();
    this.userDataPath = userDataPath;
    this.defaultDownloadPath = defaultDownloadPath;
    this.storagePath = path.join(userDataPath, 'downloads-state.json');
    this.maxConcurrent = 3;
    this.tasks = new Map(); // id -> Task object
    this.activeStreams = new Map(); // id -> { abortController, writeStream, speedHistory, lastProgressEmit }
    this.progressInterval = null;

    this.loadState();
    this.startProgressTicker();
  }

  // Probe URL to check online status, file size, filename, and range resume support
  async probeUrl(rawUrl) {
    try {
      if (!rawUrl || typeof rawUrl !== 'string') {
        return { online: false, error: 'Invalid URL provided' };
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(rawUrl.trim());
      } catch {
        return { online: false, error: 'Malformed URL structure' };
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { online: false, error: 'Only HTTP and HTTPS protocols are supported' };
      }

      // Try HEAD request first with timeout
      let headRes = null;
      let finalUrl = rawUrl;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        headRes = await fetch(rawUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoltrexLoader/1.0'
          }
        });
        clearTimeout(timeoutId);
        finalUrl = headRes.url || rawUrl;
      } catch {
        // HEAD failed, fallback to GET range request
      }

      let status = headRes ? headRes.status : 0;
      let headers = headRes ? headRes.headers : null;

      // If HEAD is not allowed (405) or failed, test with a 1-byte GET Range request
      if (!headRes || status === 405 || status >= 400) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const getRes = await fetch(rawUrl, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
              'Range': 'bytes=0-0',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoltrexLoader/1.0'
            }
          });
          clearTimeout(timeoutId);
          status = getRes.status;
          headers = getRes.headers;
          finalUrl = getRes.url || rawUrl;
        } catch (err) {
          return {
            online: false,
            error: `Network error or host unreachable: ${err.message}`
          };
        }
      }

      if (status >= 400) {
        return {
          online: false,
          statusCode: status,
          error: `Server responded with HTTP ${status}`
        };
      }

      // Parse headers
      const contentLengthHeader = headers ? headers.get('content-length') : null;
      const contentRangeHeader = headers ? headers.get('content-range') : null;
      const acceptRangesHeader = headers ? headers.get('accept-ranges') : null;
      const contentDisposition = headers ? headers.get('content-disposition') : null;
      const contentType = headers ? (headers.get('content-type') || 'application/octet-stream') : 'application/octet-stream';

      let totalBytes = 0;
      if (contentLengthHeader) {
        totalBytes = parseInt(contentLengthHeader, 10) || 0;
      } else if (contentRangeHeader) {
        const match = contentRangeHeader.match(/\/(\d+)/);
        if (match) totalBytes = parseInt(match[1], 10) || 0;
      }

      // Resume support check
      const resumable = (acceptRangesHeader && acceptRangesHeader.toLowerCase().includes('bytes')) ||
                        Boolean(contentRangeHeader && status === 206);

      // Extract filename
      let fileName = this.extractFileName(finalUrl, contentDisposition);

      return {
        online: true,
        statusCode: status,
        url: finalUrl,
        fileName,
        fileSize: totalBytes,
        formattedSize: this.formatBytes(totalBytes),
        mimeType: contentType.split(';')[0].trim(),
        resumable
      };
    } catch (err) {
      return {
        online: false,
        error: err.message || 'Unknown error occurred while checking URL'
      };
    }
  }

  extractFileName(urlStr, disposition) {
    if (disposition) {
      // Check for filename*=UTF-8''...
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          return decodeURIComponent(utf8Match[1].trim());
        } catch {}
      }

      // Check for regular filename="..."
      const match = disposition.match(/filename=["']?([^"';\r\n]+)["']?/i);
      if (match && match[1]) {
        return match[1].trim().replace(/[\\/:*?"<>|]/g, '_');
      }
    }

    try {
      const parsed = new URL(urlStr);
      const pathname = parsed.pathname;
      const basename = path.basename(pathname);
      if (basename && basename.includes('.')) {
        return decodeURIComponent(basename).replace(/[\\/:*?"<>|]/g, '_');
      }
    } catch {}

    return `download_${Date.now()}`;
  }

  formatBytes(bytes) {
    if (!bytes || bytes <= 0) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  }

  // Task Management
  async addDownload({ url, savePath, fileName, priority = 'NORMAL', autoStart = true }) {
    // Probe to ensure details
    const probe = await this.probeUrl(url);
    const resolvedSavePath = savePath || this.defaultDownloadPath;
    const finalFileName = this.sanitizeFileName(fileName || probe.fileName || `file_${Date.now()}`);

    // Ensure save directory exists
    try {
      if (!fs.existsSync(resolvedSavePath)) {
        fs.mkdirSync(resolvedSavePath, { recursive: true });
      }
    } catch (err) {
      throw new Error(`Cannot access save directory: ${err.message}`);
    }

    // Resolve unique filename if already exists
    const resolvedFileName = this.getUniqueFileName(resolvedSavePath, finalFileName);
    const finalFilePath = path.join(resolvedSavePath, resolvedFileName);
    const partFilePath = `${finalFilePath}.part`;

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const task = {
      id: taskId,
      url,
      savePath: resolvedSavePath,
      fileName: resolvedFileName,
      filePath: finalFilePath,
      partPath: partFilePath,
      totalBytes: probe.fileSize || 0,
      downloadedBytes: 0,
      progress: 0,
      speed: 0,
      eta: 0,
      status: autoStart ? 'QUEUED' : 'PAUSED',
      priority: priority.toUpperCase(), // HIGH, NORMAL, LOW
      resumable: probe.resumable ?? true,
      mimeType: probe.mimeType || 'application/octet-stream',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    this.tasks.set(taskId, task);
    this.saveState();
    this.emit('task-added', task);

    if (autoStart) {
      this.scheduleQueue();
    }

    return task;
  }

  sanitizeFileName(name) {
    if (!name) return `download_${Date.now()}`;
    let cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
    if (!cleaned) return `download_${Date.now()}`;
    if (cleaned.length > 180) {
      const ext = path.extname(cleaned);
      const base = path.basename(cleaned, ext);
      cleaned = base.slice(0, 180 - ext.length) + ext;
    }
    return cleaned;
  }

  getUniqueFileName(dir, name) {
    let target = path.join(dir, name);
    if (!fs.existsSync(target) && !fs.existsSync(`${target}.part`)) {
      return name;
    }

    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let counter = 1;
    while (fs.existsSync(path.join(dir, `${base} (${counter})${ext}`)) ||
           fs.existsSync(path.join(dir, `${base} (${counter})${ext}.part`))) {
      counter++;
    }
    return `${base} (${counter})${ext}`;
  }

  // Queue Scheduling
  scheduleQueue() {
    let runningCount = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'DOWNLOADING') {
        runningCount++;
      }
    }

    const availableSlots = this.maxConcurrent - runningCount;
    if (availableSlots <= 0) return;

    // Collect QUEUED tasks sorted by priority (HIGH=3, NORMAL=2, LOW=1) then createdAt
    const priorityWeight = { HIGH: 3, NORMAL: 2, LOW: 1 };
    const queuedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'QUEUED')
      .sort((a, b) => {
        const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2);
        if (pDiff !== 0) return pDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    const toStart = queuedTasks.slice(0, availableSlots);
    for (const task of toStart) {
      this.executeDownload(task.id);
    }
  }

  // Download Execution Pipeline
  async executeDownload(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'DOWNLOADING';
    task.error = null;
    task.updatedAt = new Date().toISOString();
    this.emit('task-updated', task);

    // Setup streaming & abort controller
    const abortController = new AbortController();
    let existingBytes = 0;

    // Check if .part file already exists for resuming
    if (fs.existsSync(task.partPath)) {
      try {
        const stat = fs.statSync(task.partPath);
        existingBytes = stat.size;
      } catch {
        existingBytes = 0;
      }
    }

    // If completed or file already at totalBytes
    if (task.totalBytes > 0 && existingBytes >= task.totalBytes) {
      this.finalizeCompletedTask(task);
      return;
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoltrexLoader/1.0'
    };

    const isResuming = task.resumable && existingBytes > 0;
    if (isResuming) {
      headers['Range'] = `bytes=${existingBytes}-`;
      task.downloadedBytes = existingBytes;
    } else {
      existingBytes = 0;
      task.downloadedBytes = 0;
    }

    try {
      const response = await fetch(task.url, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status} ${response.statusText}`);
      }

      // Handle 200 vs 206
      const isPartial = response.status === 206;
      let writeStream;

      if (isResuming && isPartial) {
        writeStream = fs.createWriteStream(task.partPath, { flags: 'a' });
      } else {
        // Full restart
        task.downloadedBytes = 0;
        existingBytes = 0;
        writeStream = fs.createWriteStream(task.partPath, { flags: 'w' });
      }

      // Update total bytes if provided
      const cl = response.headers.get('content-length');
      const cr = response.headers.get('content-range');
      if (cr) {
        const m = cr.match(/\/(\d+)/);
        if (m) task.totalBytes = parseInt(m[1], 10);
      } else if (cl) {
        task.totalBytes = (isResuming && isPartial) ? existingBytes + parseInt(cl, 10) : parseInt(cl, 10);
      }

      const activeRecord = {
        abortController,
        writeStream,
        speedHistory: [],
        lastSpeedCalc: Date.now(),
        lastBytes: task.downloadedBytes
      };
      this.activeStreams.set(taskId, activeRecord);

      const reader = response.body.getReader();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value && value.length > 0) {
              writeStream.write(Buffer.from(value));
              task.downloadedBytes += value.length;

              // Record speed telemetry
              const now = Date.now();
              activeRecord.speedHistory.push({ time: now, bytes: value.length });
              // Keep only last 2.5s of speed history
              while (activeRecord.speedHistory.length > 0 && now - activeRecord.speedHistory[0].time > 2500) {
                activeRecord.speedHistory.shift();
              }

              // Update progress percent
              if (task.totalBytes > 0) {
                task.progress = Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
              }
            }
          }

          // Finish stream
          writeStream.end();
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });

          this.activeStreams.delete(taskId);
          this.finalizeCompletedTask(task);
        } catch (pumpErr) {
          writeStream.end();
          this.activeStreams.delete(taskId);
          if (task.status === 'PAUSED' || task.status === 'CANCELLED') {
            // Intentionally paused/cancelled, do nothing
            return;
          }
          this.handleTaskError(task, pumpErr);
        }
      };

      pump();
    } catch (fetchErr) {
      this.activeStreams.delete(taskId);
      if (task.status === 'PAUSED' || task.status === 'CANCELLED') return;
      this.handleTaskError(task, fetchErr);
    }
  }

  finalizeCompletedTask(task) {
    try {
      if (fs.existsSync(task.partPath)) {
        fs.renameSync(task.partPath, task.filePath);
      }
    } catch (err) {
      this.handleTaskError(task, new Error(`Failed to save completed file: ${err.message}`));
      return;
    }

    task.status = 'COMPLETED';
    task.progress = 100;
    task.speed = 0;
    task.eta = 0;
    task.downloadedBytes = task.totalBytes || task.downloadedBytes;
    task.completedAt = new Date().toISOString();
    task.updatedAt = new Date().toISOString();

    this.saveState();
    this.emit('task-updated', task);
    this.emit('task-completed', task);

    // Trigger desktop notification
    if (Notification.isSupported()) {
      new Notification({
        title: 'Download Completed',
        body: `${task.fileName} has finished downloading.`
      }).show();
    }

    this.scheduleQueue();
  }

  handleTaskError(task, err) {
    task.status = 'ERROR';
    task.error = err.message || 'Download failed';
    task.speed = 0;
    task.eta = 0;
    task.updatedAt = new Date().toISOString();

    this.saveState();
    this.emit('task-updated', task);
    this.emit('task-error', { task, error: task.error });
    this.scheduleQueue();
  }

  // Individual Actions
  pauseDownload(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'DOWNLOADING') {
      const active = this.activeStreams.get(taskId);
      if (active) {
        active.abortController.abort();
        if (active.writeStream) active.writeStream.end();
        this.activeStreams.delete(taskId);
      }
    }

    task.status = 'PAUSED';
    task.speed = 0;
    task.eta = 0;
    task.updatedAt = new Date().toISOString();

    this.saveState();
    this.emit('task-updated', task);
    this.scheduleQueue();
    return true;
  }

  resumeDownload(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'COMPLETED') return false;

    task.status = 'QUEUED';
    task.error = null;
    task.updatedAt = new Date().toISOString();

    this.saveState();
    this.emit('task-updated', task);
    this.scheduleQueue();
    return true;
  }

  cancelDownload(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'DOWNLOADING') {
      const active = this.activeStreams.get(taskId);
      if (active) {
        active.abortController.abort();
        if (active.writeStream) active.writeStream.end();
        this.activeStreams.delete(taskId);
      }
    }

    task.status = 'CANCELLED';
    task.speed = 0;
    task.eta = 0;
    task.updatedAt = new Date().toISOString();

    // Remove .part file
    try {
      if (fs.existsSync(task.partPath)) {
        fs.unlinkSync(task.partPath);
      }
    } catch {}

    this.saveState();
    this.emit('task-updated', task);
    this.scheduleQueue();
    return true;
  }

  deleteDownload(taskId, deleteFromDisk = false) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    this.cancelDownload(taskId);

    if (deleteFromDisk) {
      try {
        if (fs.existsSync(task.filePath)) fs.unlinkSync(task.filePath);
        if (fs.existsSync(task.partPath)) fs.unlinkSync(task.partPath);
      } catch {}
    }

    this.tasks.delete(taskId);
    this.saveState();
    this.emit('task-deleted', taskId);
    return true;
  }

  // Global Actions
  pauseAll() {
    for (const task of this.tasks.values()) {
      if (task.status === 'DOWNLOADING' || task.status === 'QUEUED') {
        this.pauseDownload(task.id);
      }
    }
  }

  resumeAll() {
    for (const task of this.tasks.values()) {
      if (['PAUSED', 'ERROR', 'CANCELLED'].includes(task.status)) {
        task.status = 'QUEUED';
        task.error = null;
        this.emit('task-updated', task);
      }
    }
    this.saveState();
    this.scheduleQueue();
  }

  stopAll() {
    for (const task of this.tasks.values()) {
      if (['DOWNLOADING', 'QUEUED'].includes(task.status)) {
        this.cancelDownload(task.id);
      }
    }
  }

  clearCompleted() {
    for (const [id, task] of this.tasks.entries()) {
      if (['COMPLETED', 'CANCELLED'].includes(task.status)) {
        this.tasks.delete(id);
      }
    }
    this.saveState();
    this.emit('tasks-cleared');
  }

  setPriority(taskId, priority) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.priority = priority.toUpperCase();
    this.saveState();
    this.emit('task-updated', task);
    this.scheduleQueue();
    return true;
  }

  setConcurrency(limit) {
    const parsed = parseInt(limit, 10);
    if (parsed > 0 && parsed <= 10) {
      this.maxConcurrent = parsed;
      this.scheduleQueue();
      return true;
    }
    return false;
  }

  // Cross-Platform Native File Openers (Linux / SteamOS / Windows)
  openFile(taskId) {
    const task = this.tasks.get(taskId);
    if (!task || !fs.existsSync(task.filePath)) {
      return { success: false, error: 'File does not exist on disk' };
    }
    shell.openPath(task.filePath);
    return { success: true };
  }

  showInFolder(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return { success: false, error: 'Task not found' };

    const target = fs.existsSync(task.filePath) ? task.filePath : task.partPath;
    if (fs.existsSync(target)) {
      shell.showItemInFolder(target);
      return { success: true };
    }
    // If neither exists, open directory
    if (fs.existsSync(task.savePath)) {
      shell.openPath(task.savePath);
      return { success: true };
    }
    return { success: false, error: 'Directory does not exist' };
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  // Telemetry Progress Ticker
  startProgressTicker() {
    this.progressInterval = setInterval(() => {
      let hasActive = false;
      const progressPayload = [];

      for (const [taskId, record] of this.activeStreams.entries()) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'DOWNLOADING') continue;

        hasActive = true;
        const now = Date.now();

        // Calculate speed over last 2 seconds window
        const totalRecentBytes = record.speedHistory.reduce((sum, item) => sum + item.bytes, 0);
        const windowDurationSeconds = Math.max(1, (now - (record.speedHistory[0]?.time || now)) / 1000);
        const currentSpeed = Math.round(totalRecentBytes / windowDurationSeconds);

        task.speed = currentSpeed;

        // Calculate dynamic ETA
        if (task.totalBytes > 0 && currentSpeed > 0) {
          const remainingBytes = Math.max(0, task.totalBytes - task.downloadedBytes);
          task.eta = Math.ceil(remainingBytes / currentSpeed);
        } else {
          task.eta = 0;
        }

        progressPayload.push({
          id: task.id,
          downloadedBytes: task.downloadedBytes,
          totalBytes: task.totalBytes,
          progress: task.progress,
          speed: task.speed,
          eta: task.eta
        });
      }

      if (hasActive && progressPayload.length > 0) {
        this.emit('progress-batch', progressPayload);
      }
    }, 400);
  }

  // Persistence
  saveState() {
    try {
      const data = {
        maxConcurrent: this.maxConcurrent,
        tasks: Array.from(this.tasks.values()).map(t => ({
          ...t,
          speed: 0,
          eta: 0,
          status: t.status === 'DOWNLOADING' ? 'PAUSED' : t.status // On restart, pause active
        }))
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save downloads state:', err);
    }
  }

  loadState() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.maxConcurrent) this.maxConcurrent = parsed.maxConcurrent;
        if (Array.isArray(parsed.tasks)) {
          for (const item of parsed.tasks) {
            this.tasks.set(item.id, item);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load previous downloads state:', err);
    }
  }

  destroy() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    for (const [taskId, record] of this.activeStreams.entries()) {
      try {
        record.abortController.abort();
        if (record.writeStream) record.writeStream.end();
      } catch {}
    }
    this.activeStreams.clear();
    this.removeAllListeners();
  }
}

module.exports = { DownloadEngine };
