const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
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
    this.defaultConnections = 8;
    this.enableMultiConnection = true;
    this.organizeByCategory = false;
    this.tasks = new Map(); // id -> Task object
    this.activeStreams = new Map(); // id -> active streaming record
    this.progressInterval = null;

    this.loadState();
    this.startProgressTicker();
  }

  getFileCategory(fileName = '', mimeType = '') {
    const name = (fileName || '').toLowerCase();
    const parts = name.split('.');
    const ext = parts.length > 1 ? parts.pop() : '';

    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', '7zip', 'tgz', 'z', 'cab'].includes(ext)) {
      return 'compressed';
    }
    if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'wmv', 'm4v', '3gp', 'ts'].includes(ext) || (mimeType && mimeType.startsWith('video/'))) {
      return 'video';
    }
    if (['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'alac', 'aiff'].includes(ext) || (mimeType && mimeType.startsWith('audio/'))) {
      return 'audio';
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'epub', 'md', 'csv', 'rtf', 'odt', 'ods', 'odp'].includes(ext) || (mimeType && (mimeType.startsWith('text/') || mimeType.includes('pdf')))) {
      return 'documents';
    }
    if (['exe', 'msi', 'deb', 'rpm', 'appimage', 'sh', 'apk', 'dmg', 'pkg', 'bin', 'run'].includes(ext)) {
      return 'programs';
    }
    return 'others';
  }

  getCategoryFolder(category) {
    const map = {
      compressed: 'Compressed',
      video: 'Videos',
      audio: 'Audio',
      documents: 'Documents',
      programs: 'Programs',
      others: 'Others'
    };
    return map[category] || 'Others';
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
      let fileName = this.extractFileName(finalUrl, contentDisposition, contentType);

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

  extractFileName(urlStr, disposition, contentType = '') {
    if (disposition) {
      // Check for filename*=UTF-8''...
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          const decoded = decodeURIComponent(utf8Match[1].trim()).replace(/[\\/:*?"<>|\r\n]/g, '_');
          if (decoded) return decoded;
        } catch {}
      }

      // Check for regular filename="..."
      const match = disposition.match(/filename\s*=\s*["']?([^"';\r\n]+)["']?/i);
      if (match && match[1]) {
        const cleaned = match[1].trim().replace(/[\\/:*?"<>|\r\n]/g, '_');
        if (cleaned) return cleaned;
      }
    }

    try {
      const parsed = new URL(urlStr);

      // Check query parameters commonly used for filenames (e.g., ?filename=xyz, ?name=xyz, ?file=xyz)
      const queryParamNames = ['filename', 'file_name', 'name', 'file', 'title', 'fn', 'f'];
      for (const param of queryParamNames) {
        const val = parsed.searchParams.get(param);
        if (val && typeof val === 'string') {
          const cleanVal = decodeURIComponent(val.trim()).replace(/[\\/:*?"<>|\r\n]/g, '_');
          if (cleanVal && cleanVal.includes('.')) {
            return cleanVal;
          }
        }
      }

      const pathname = parsed.pathname;
      const rawBasename = path.basename(pathname);
      if (rawBasename && rawBasename !== '/' && rawBasename !== '.' && rawBasename !== '..') {
        const decoded = decodeURIComponent(rawBasename).replace(/[\\/:*?"<>|\r\n]/g, '_');
        if (decoded && decoded.includes('.')) {
          return decoded;
        } else if (decoded && decoded.length > 1) {
          // If basename has no extension, try to append from contentType if available
          const ext = this.getExtensionFromMime(contentType);
          return ext ? `${decoded}${ext}` : decoded;
        }
      }
    } catch {}

    const extFromMime = this.getExtensionFromMime(contentType);
    return `download_${Date.now()}${extFromMime || ''}`;
  }

  getExtensionFromMime(mimeType) {
    if (!mimeType) return '';
    const clean = mimeType.toLowerCase().split(';')[0].trim();
    const mimeMap = {
      'application/zip': '.zip',
      'application/x-zip-compressed': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
      'application/x-tar': '.tar',
      'application/gzip': '.tar.gz',
      'application/pdf': '.pdf',
      'video/mp4': '.mp4',
      'video/x-matroska': '.mkv',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'application/vnd.android.package-archive': '.apk',
      'application/x-msdownload': '.exe',
      'application/x-iso9660-image': '.iso'
    };
    return mimeMap[clean] || '';
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

  // Batch URL Probe with controlled concurrency
  async batchProbeUrls(urls) {
    if (!Array.isArray(urls)) return [];
    const results = new Array(urls.length);
    const concurrency = 4;
    let index = 0;

    const probeWorker = async () => {
      while (index < urls.length) {
        const currentIndex = index++;
        const item = urls[currentIndex];
        const rawUrl = typeof item === 'string' ? item : item?.url;
        if (!rawUrl) {
          results[currentIndex] = { url: '', online: false, error: 'Empty URL' };
          continue;
        }
        try {
          const probe = await this.probeUrl(rawUrl);
          results[currentIndex] = {
            url: rawUrl,
            ...probe
          };
        } catch (err) {
          results[currentIndex] = {
            url: rawUrl,
            online: false,
            error: err.message || 'Probe failed'
          };
        }
      }
    };

    const workerCount = Math.min(concurrency, urls.length);
    const workers = Array.from({ length: workerCount }, () => probeWorker());
    await Promise.all(workers);
    return results;
  }

  initializeTaskChunks(task) {
    if (
      !task.totalBytes ||
      task.totalBytes < 1024 * 1024 ||
      !task.resumable ||
      !this.enableMultiConnection ||
      task.connections <= 1
    ) {
      task.chunks = [];
      return;
    }

    const numChunks = Math.max(1, Math.min(32, task.connections || this.defaultConnections || 8));
    const chunkSize = Math.floor(task.totalBytes / numChunks);
    task.chunks = [];
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = i === numChunks - 1 ? task.totalBytes - 1 : (i + 1) * chunkSize - 1;
      task.chunks.push({
        index: i,
        startByte: start,
        endByte: end,
        currentByte: start,
        totalBytes: end - start + 1,
        downloadedBytes: 0,
        progress: 0,
        status: 'QUEUED',
        speed: 0
      });
    }
  }

  async addDownload({
    url,
    savePath,
    fileName,
    priority = 'NORMAL',
    autoStart = true,
    packageName = null,
    connections = null,
    customFolderSelected = false
  }) {
    // Probe to ensure details
    const probe = await this.probeUrl(url);
    const finalFileName = this.sanitizeFileName(fileName || probe.fileName || `file_${Date.now()}`);
    const mimeType = probe.mimeType || 'application/octet-stream';

    let resolvedSavePath = savePath || this.defaultDownloadPath;

    // Apply category organization if enabled and user did not explicitly pick a custom folder
    if (this.organizeByCategory && !customFolderSelected) {
      const category = this.getFileCategory(finalFileName, mimeType);
      const categoryFolder = this.getCategoryFolder(category);

      const normalizedSave = path.normalize(resolvedSavePath);
      const normalizedDefault = path.normalize(this.defaultDownloadPath);
      const currentFolderBase = path.basename(normalizedSave);

      if (normalizedSave === normalizedDefault || !savePath) {
        resolvedSavePath = path.join(this.defaultDownloadPath, categoryFolder);
      } else if (currentFolderBase.toLowerCase() !== categoryFolder.toLowerCase()) {
        resolvedSavePath = path.join(normalizedSave, categoryFolder);
      }
    }

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

    const chosenConnections = connections ? Math.max(1, Math.min(32, parseInt(connections, 10) || 8)) : (this.defaultConnections || 8);

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const task = {
      id: taskId,
      url,
      packageName: packageName || null,
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
      connections: chosenConnections,
      chunks: [],
      mimeType: probe.mimeType || 'application/octet-stream',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      error: null
    };

    this.initializeTaskChunks(task);

    this.tasks.set(taskId, task);
    this.saveState();
    this.emit('task-added', task);

    if (autoStart) {
      this.scheduleQueue();
    }

    return task;
  }

  // Add multiple downloads in batch (e.g. multi-part archives)
  async addBatchDownloads({
    items = [],
    baseSavePath,
    packageName = '',
    createSubfolder = true,
    priority = 'NORMAL',
    autoStart = true,
    connections = null,
    customFolderSelected = false
  }) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const basePath = baseSavePath || this.defaultDownloadPath;
    const sanitizedPackage = packageName ? this.sanitizeFileName(packageName).trim() : '';

    let targetDir = basePath;

    // Apply category organization if enabled and not overridden with a custom folder
    if (this.organizeByCategory && !customFolderSelected && (!baseSavePath || path.normalize(baseSavePath) === path.normalize(this.defaultDownloadPath))) {
      const catCounts = {};
      items.forEach((item) => {
        const cat = this.getFileCategory(item.fileName || item.url, item.mimeType);
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
      let dominantCategory = 'others';
      let maxCount = 0;
      for (const [cat, count] of Object.entries(catCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantCategory = cat;
        }
      }
      const categoryFolder = this.getCategoryFolder(dominantCategory);
      targetDir = path.join(this.defaultDownloadPath, categoryFolder);
    }

    if (createSubfolder && sanitizedPackage) {
      targetDir = path.join(targetDir, sanitizedPackage);
    }

    // Ensure destination directory exists
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch (err) {
      throw new Error(`Cannot create batch save directory: ${err.message}`);
    }

    const createdTasks = [];
    const now = new Date().toISOString();
    const chosenConnections = connections ? Math.max(1, Math.min(32, parseInt(connections, 10) || 8)) : (this.defaultConnections || 8);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemUrl = typeof item === 'string' ? item : item.url;
      if (!itemUrl || typeof itemUrl !== 'string') continue;

      let chosenName = item.fileName;
      if (!chosenName) {
        chosenName = this.extractFileName(itemUrl, null, item.mimeType);
      }
      const sanitizedItemName = this.sanitizeFileName(chosenName || `part_${i + 1}`);
      const resolvedFileName = this.getUniqueFileName(targetDir, sanitizedItemName);
      const finalFilePath = path.join(targetDir, resolvedFileName);
      const partFilePath = `${finalFilePath}.part`;

      const taskId = `task_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const task = {
        id: taskId,
        url: itemUrl,
        packageName: sanitizedPackage || null,
        savePath: targetDir,
        fileName: resolvedFileName,
        filePath: finalFilePath,
        partPath: partFilePath,
        totalBytes: item.fileSize || 0,
        downloadedBytes: 0,
        progress: 0,
        speed: 0,
        eta: 0,
        status: autoStart ? 'QUEUED' : 'PAUSED',
        priority: priority.toUpperCase(),
        resumable: item.resumable ?? true,
        connections: chosenConnections,
        chunks: [],
        mimeType: item.mimeType || 'application/octet-stream',
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        error: null
      };

      this.initializeTaskChunks(task);

      this.tasks.set(taskId, task);
      createdTasks.push(task);
      this.emit('task-added', task);
    }

    this.saveState();

    if (autoStart) {
      this.scheduleQueue();
    }

    return createdTasks;
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

    const shouldUseSegments =
      this.enableMultiConnection &&
      (task.connections || this.defaultConnections || 8) > 1 &&
      task.resumable &&
      task.totalBytes >= 1024 * 1024; // at least 1MB for chunking

    if (shouldUseSegments) {
      await this.executeSegmentedDownload(task);
    } else {
      await this.executeSingleStreamDownload(task);
    }
  }

  // Segmented Multi-Connection Engine (Parallel Range Streams)
  async executeSegmentedDownload(task) {
    task.status = 'DOWNLOADING';
    task.error = null;
    task.updatedAt = new Date().toISOString();
    this.emit('task-updated', task);

    // Initialize chunks if not already initialized
    if (!task.chunks || task.chunks.length === 0) {
      this.initializeTaskChunks(task);
    }

    if (!task.chunks || task.chunks.length === 0) {
      // Fallback if chunks couldn't be generated
      await this.executeSingleStreamDownload(task);
      return;
    }

    // Open file descriptor for random-access concurrent writing
    let fileHandle = null;
    try {
      if (!fs.existsSync(task.partPath)) {
        fileHandle = await fsPromises.open(task.partPath, 'w+');
        try {
          await fileHandle.truncate(task.totalBytes);
        } catch {
          // Truncate might not be supported on all exotic mount systems; continue
        }
      } else {
        fileHandle = await fsPromises.open(task.partPath, 'r+');
      }
    } catch (err) {
      this.handleTaskError(task, new Error(`Failed to initialize part file: ${err.message}`));
      return;
    }

    const chunkControllers = new Map();
    const chunkSpeedHistories = new Map();
    const overallSpeedHistory = [];

    const activeRecord = {
      isSegmented: true,
      fileHandle,
      chunkControllers,
      chunkSpeedHistories,
      speedHistory: overallSpeedHistory,
      lastSpeedCalc: Date.now(),
      lastBytes: task.downloadedBytes
    };
    this.activeStreams.set(task.id, activeRecord);

    let isTerminated = false;
    const cleanupAndClose = async () => {
      if (isTerminated) return;
      isTerminated = true;
      for (const ctrl of chunkControllers.values()) {
        try { ctrl.abort(); } catch {}
      }
      chunkControllers.clear();
      try {
        if (fileHandle) {
          await fileHandle.close();
          fileHandle = null;
        }
      } catch {}
      this.activeStreams.delete(task.id);
    };

    // Serialized write queue per task to guarantee orderly non-blocking random writes
    let writeQueue = Promise.resolve();
    const safeWrite = (buffer, position) => {
      writeQueue = writeQueue.then(async () => {
        if (!fileHandle) return;
        await fileHandle.write(buffer, 0, buffer.length, position);
      }).catch(err => {
        console.error(`Segment write error at position ${position}:`, err);
      });
      return writeQueue;
    };

    const downloadChunk = async (chunk) => {
      let retryCount = 0;

      while (!isTerminated && task.status === 'DOWNLOADING') {
        // If chunk is already completed
        if (chunk.currentByte > chunk.endByte) {
          chunk.status = 'COMPLETED';
          chunk.downloadedBytes = chunk.totalBytes;
          chunk.progress = 100;
          chunk.speed = 0;
          return;
        }

        chunk.status = 'DOWNLOADING';
        const controller = new AbortController();
        chunkControllers.set(chunk.index, controller);
        if (!chunkSpeedHistories.has(chunk.index)) {
          chunkSpeedHistories.set(chunk.index, []);
        }

        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoltrexLoader/1.0',
          'Range': `bytes=${chunk.currentByte}-${chunk.endByte}`
        };

        try {
          const response = await fetch(task.url, {
            method: 'GET',
            headers,
            redirect: 'follow',
            signal: controller.signal
          });

          // If server returns HTTP 200 instead of 206, server doesn't support Range requests for this resource
          if (response.status === 200 && chunk.index === 0 && chunk.startByte === 0 && chunk.currentByte === 0) {
            console.warn(`Host does not support byte range requests (returned 200 OK). Falling back to single-stream.`);
            await cleanupAndClose();
            task.resumable = false;
            task.chunks = [];
            await this.executeSingleStreamDownload(task);
            return;
          }

          // If unrecoverable authentication or expired link error
          if ([401, 403, 404, 410].includes(response.status)) {
            chunk.status = 'ERROR';
            throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'Access Denied / Expired'})`);
          }

          // If transient error (rate-limiting 429 or server errors 500-504)
          if (!response.ok && response.status !== 206) {
            throw new Error(`HTTP ${response.status} ${response.statusText || 'Transient Error'}`);
          }

          const reader = response.body.getReader();
          retryCount = 0; // Successfully connected and streaming!

          while (!isTerminated && task.status === 'DOWNLOADING') {
            const { done, value } = await reader.read();
            if (done) break;

            if (value && value.length > 0) {
              const buf = Buffer.from(value);
              const writePos = chunk.currentByte;
              await safeWrite(buf, writePos);

              chunk.currentByte += buf.length;
              chunk.downloadedBytes = Math.min(chunk.totalBytes, chunk.currentByte - chunk.startByte);
              chunk.progress = Math.min(100, Math.round((chunk.downloadedBytes / chunk.totalBytes) * 100));

              const now = Date.now();
              const chunkHistory = chunkSpeedHistories.get(chunk.index) || [];
              chunkHistory.push({ time: now, bytes: buf.length });
              while (chunkHistory.length > 0 && now - chunkHistory[0].time > 2500) {
                chunkHistory.shift();
              }

              overallSpeedHistory.push({ time: now, bytes: buf.length });
              while (overallSpeedHistory.length > 0 && now - overallSpeedHistory[0].time > 2500) {
                overallSpeedHistory.shift();
              }
            }
          }

          if (chunk.currentByte >= chunk.endByte) {
            chunk.status = 'COMPLETED';
            chunk.downloadedBytes = chunk.totalBytes;
            chunk.progress = 100;
            chunk.speed = 0;
            return;
          }
        } catch (chunkErr) {
          if (isTerminated || task.status === 'PAUSED' || task.status === 'CANCELLED') {
            return;
          }

          // Fatal errors (401, 403, 404, 410) propagate to stop the download
          if ([401, 403, 404, 410].some(code => chunkErr.message.includes(`HTTP ${code}`))) {
            chunk.status = 'ERROR';
            throw chunkErr;
          }

          retryCount++;
          chunk.speed = 0;
          console.warn(`Chunk ${chunk.index + 1} stream hiccup (retry ${retryCount}): ${chunkErr.message}`);

          // Mark retrying and wait with backoff without aborting other streams!
          chunk.status = 'RETRYING';
          const backoffDelay = Math.min(8000, 1000 * Math.min(retryCount, 8));
          await new Promise(r => setTimeout(r, backoffDelay));
        } finally {
          chunkControllers.delete(chunk.index);
        }
      }
    };

    try {
      const activeChunks = task.chunks.filter(c => c.status !== 'COMPLETED');
      const startChunkWithStagger = async (chunk, idx) => {
        if (idx > 0) {
          await new Promise(r => setTimeout(r, Math.min(idx * 75, 600)));
        }
        return downloadChunk(chunk);
      };
      await Promise.all(activeChunks.map((c, i) => startChunkWithStagger(c, i)));

      await writeQueue;

      const allCompleted = task.chunks.every(c => c.status === 'COMPLETED');
      if (allCompleted && task.status === 'DOWNLOADING') {
        await cleanupAndClose();
        this.finalizeCompletedTask(task);
      }
    } catch (err) {
      await writeQueue;
      await cleanupAndClose();
      if (task.status === 'PAUSED' || task.status === 'CANCELLED') {
        return;
      }
      this.handleTaskError(task, err);
    }
  }

  // Single-Stream Fallback Download Pipeline
  async executeSingleStreamDownload(task) {
    task.status = 'DOWNLOADING';
    task.error = null;
    task.updatedAt = new Date().toISOString();
    this.emit('task-updated', task);

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

      const isPartial = response.status === 206;
      let writeStream;

      if (isResuming && isPartial) {
        writeStream = fs.createWriteStream(task.partPath, { flags: 'a' });
      } else {
        task.downloadedBytes = 0;
        existingBytes = 0;
        writeStream = fs.createWriteStream(task.partPath, { flags: 'w' });
      }

      const cl = response.headers.get('content-length');
      const cr = response.headers.get('content-range');
      if (cr) {
        const m = cr.match(/\/(\d+)/);
        if (m) task.totalBytes = parseInt(m[1], 10);
      } else if (cl) {
        task.totalBytes = (isResuming && isPartial) ? existingBytes + parseInt(cl, 10) : parseInt(cl, 10);
      }

      const activeRecord = {
        isSegmented: false,
        abortController,
        writeStream,
        speedHistory: [],
        lastSpeedCalc: Date.now(),
        lastBytes: task.downloadedBytes
      };
      this.activeStreams.set(task.id, activeRecord);

      const reader = response.body.getReader();

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            if (value && value.length > 0) {
              writeStream.write(Buffer.from(value));
              task.downloadedBytes += value.length;

              const now = Date.now();
              activeRecord.speedHistory.push({ time: now, bytes: value.length });
              while (activeRecord.speedHistory.length > 0 && now - activeRecord.speedHistory[0].time > 2500) {
                activeRecord.speedHistory.shift();
              }

              if (task.totalBytes > 0) {
                task.progress = Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
              }
            }
          }

          writeStream.end();
          await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });

          this.activeStreams.delete(task.id);
          this.finalizeCompletedTask(task);
        } catch (pumpErr) {
          writeStream.end();
          this.activeStreams.delete(task.id);
          if (task.status === 'PAUSED' || task.status === 'CANCELLED') {
            return;
          }
          this.handleTaskError(task, pumpErr);
        }
      };

      pump();
    } catch (fetchErr) {
      this.activeStreams.delete(task.id);
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
    if (task.chunks) {
      for (const c of task.chunks) {
        c.status = 'COMPLETED';
        c.downloadedBytes = c.totalBytes;
        c.progress = 100;
        c.speed = 0;
      }
    }
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
        if (active.isSegmented) {
          for (const ctrl of active.chunkControllers.values()) {
            try { ctrl.abort(); } catch {}
          }
          active.chunkControllers.clear();
          if (active.fileHandle) {
            active.fileHandle.close().catch(() => {});
          }
        } else {
          active.abortController.abort();
          if (active.writeStream) active.writeStream.end();
        }
        this.activeStreams.delete(taskId);
      }
    }

    task.status = 'PAUSED';
    task.speed = 0;
    task.eta = 0;
    if (task.chunks) {
      for (const c of task.chunks) {
        if (c.status === 'DOWNLOADING' || c.status === 'RETRYING') {
          c.status = 'PAUSED';
        }
        c.speed = 0;
      }
    }
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
    if (task.chunks) {
      for (const c of task.chunks) {
        if (c.status !== 'COMPLETED') {
          c.status = 'QUEUED';
        }
        c.speed = 0;
      }
    }
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
        if (active.isSegmented) {
          for (const ctrl of active.chunkControllers.values()) {
            try { ctrl.abort(); } catch {}
          }
          active.chunkControllers.clear();
          if (active.fileHandle) {
            active.fileHandle.close().catch(() => {});
          }
        } else {
          active.abortController.abort();
          if (active.writeStream) active.writeStream.end();
        }
        this.activeStreams.delete(taskId);
      }
    }

    task.status = 'CANCELLED';
    task.speed = 0;
    task.eta = 0;
    if (task.chunks) {
      for (const c of task.chunks) {
        c.status = 'CANCELLED';
        c.speed = 0;
      }
    }
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
    const list = Array.from(this.tasks.values());
    return list.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (typeof a.id === 'number' ? a.id : 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (typeof b.id === 'number' ? b.id : 0);
      return (timeB || 0) - (timeA || 0);
    });
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

        // Calculate overall speed over last 2 seconds window
        const totalRecentBytes = record.speedHistory.reduce((sum, item) => sum + item.bytes, 0);
        const windowDurationSeconds = Math.max(1, (now - (record.speedHistory[0]?.time || now)) / 1000);
        const currentSpeed = Math.round(totalRecentBytes / windowDurationSeconds);

        task.speed = currentSpeed;

        if (record.isSegmented && task.chunks) {
          // Calculate individual chunk speeds
          for (const chunk of task.chunks) {
            const chunkHistory = record.chunkSpeedHistories?.get(chunk.index) || [];
            const chunkRecentBytes = chunkHistory.reduce((sum, item) => sum + item.bytes, 0);
            const chunkDuration = Math.max(1, (now - (chunkHistory[0]?.time || now)) / 1000);
            chunk.speed = chunk.status === 'DOWNLOADING' ? Math.round(chunkRecentBytes / chunkDuration) : 0;
          }
          // Recalculate total downloaded bytes across all chunks
          task.downloadedBytes = task.chunks.reduce((acc, c) => acc + (c.currentByte - c.startByte), 0);
          if (task.totalBytes > 0) {
            task.progress = Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
          }
        }

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
          eta: task.eta,
          connections: task.connections || 1,
          chunks: task.chunks
            ? task.chunks.map((c) => ({
                index: c.index,
                startByte: c.startByte,
                endByte: c.endByte,
                currentByte: c.currentByte,
                downloadedBytes: Math.min(c.totalBytes, c.currentByte - c.startByte),
                totalBytes: c.totalBytes,
                progress: c.progress || 0,
                status: c.status,
                speed: c.speed || 0
              }))
            : null
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
        tasks: Array.from(this.tasks.values()).map((t) => ({
          ...t,
          speed: 0,
          eta: 0,
          status: t.status === 'DOWNLOADING' ? 'PAUSED' : t.status, // On restart, pause active
          chunks: t.chunks
            ? t.chunks.map((c) => ({
                ...c,
                speed: 0,
                status: c.status === 'DOWNLOADING' || c.status === 'RETRYING' ? 'PAUSED' : c.status
              }))
            : []
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
        if (record.isSegmented) {
          for (const ctrl of record.chunkControllers.values()) {
            ctrl.abort();
          }
          if (record.fileHandle) {
            record.fileHandle.close().catch(() => {});
          }
        } else {
          record.abortController.abort();
          if (record.writeStream) record.writeStream.end();
        }
      } catch {}
    }
    this.activeStreams.clear();
    this.removeAllListeners();
  }
}

module.exports = { DownloadEngine };
