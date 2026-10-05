const { EventEmitter } = require('node:events');
const path = require('node:path');
const fs = require('node:fs');
const { spawn, execSync } = require('node:child_process');
const https = require('node:https');
const http = require('node:http');

/**
 * MediaEngine
 * High-performance Universal Media Downloader engine for YouTube, Facebook, TikTok,
 * Reddit, Instagram, Twitter/X, and 1000+ supported streaming sites using yt-dlp & ffmpeg.
 */
class MediaEngine extends EventEmitter {
  constructor({ userDataPath, defaultDownloadPath, getSettings }) {
    super();
    this.userDataPath = userDataPath;
    this.defaultDownloadPath = defaultDownloadPath;
    this.getSettings = typeof getSettings === 'function' ? getSettings : () => ({});
    this.activeProcesses = new Map(); // taskId -> ChildProcess
    this.cachedYtDlpPath = null;
    this.cachedFfmpegPath = null;
    this.isDownloadingYtDlp = false;
  }

  /**
   * Helper to format seconds into mm:ss or hh:mm:ss
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  /**
   * Sanitize string for valid filenames across Windows & POSIX
   */
  sanitizeFileName(str) {
    if (!str) return `media_${Date.now()}`;
    return str
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
  }

  /**
   * Locate system or bundled ffmpeg executable
   */
  findFfmpeg() {
    if (this.cachedFfmpegPath && fs.existsSync(this.cachedFfmpegPath)) {
      return this.cachedFfmpegPath;
    }

    const isWin = process.platform === 'win32';
    const exeName = isWin ? 'ffmpeg.exe' : 'ffmpeg';

    // 1. Check PATH
    try {
      const checkCmd = isWin ? `where ${exeName}` : `which ${exeName}`;
      const found = execSync(checkCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const firstLine = found.split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        this.cachedFfmpegPath = firstLine;
        return firstLine;
      }
    } catch {}

    // 2. Check standard Linux path
    if (!isWin && fs.existsSync('/usr/bin/ffmpeg')) {
      this.cachedFfmpegPath = '/usr/bin/ffmpeg';
      return '/usr/bin/ffmpeg';
    }

    // 3. Check assets or resources
    const possiblePaths = [
      path.join(__dirname, '..', 'assets', 'bin', exeName),
      path.join(process.resourcesPath || '', 'assets', 'bin', exeName),
      path.join(this.userDataPath, 'bin', exeName)
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        this.cachedFfmpegPath = p;
        return p;
      }
    }

    return null;
  }

  /**
   * Locate yt-dlp binary or auto-download if missing
   */
  async findYtDlp() {
    if (this.cachedYtDlpPath && fs.existsSync(this.cachedYtDlpPath)) {
      return this.cachedYtDlpPath;
    }

    const isWin = process.platform === 'win32';
    const exeName = isWin ? 'yt-dlp.exe' : 'yt-dlp';

    // 1. Check local assets/bin in source or app directory
    const assetBin = path.join(__dirname, '..', 'assets', 'bin', exeName);
    if (fs.existsSync(assetBin)) {
      try {
        if (!isWin) fs.chmodSync(assetBin, 0o755);
      } catch {}
      this.cachedYtDlpPath = assetBin;
      return assetBin;
    }

    // 2. Check packaged process.resourcesPath
    if (process.resourcesPath) {
      const packagedBin = path.join(process.resourcesPath, 'assets', 'bin', exeName);
      if (fs.existsSync(packagedBin)) {
        try {
          if (!isWin) fs.chmodSync(packagedBin, 0o755);
        } catch {}
        this.cachedYtDlpPath = packagedBin;
        return packagedBin;
      }
    }

    // 3. Check user data bin folder
    const userDataBin = path.join(this.userDataPath, 'bin', exeName);
    if (fs.existsSync(userDataBin)) {
      try {
        if (!isWin) fs.chmodSync(userDataBin, 0o755);
      } catch {}
      this.cachedYtDlpPath = userDataBin;
      return userDataBin;
    }

    // 4. Check system PATH
    try {
      const checkCmd = isWin ? `where ${exeName}` : `which ${exeName}`;
      const found = execSync(checkCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      const firstLine = found.split(/\r?\n/)[0];
      if (firstLine && fs.existsSync(firstLine)) {
        this.cachedYtDlpPath = firstLine;
        return firstLine;
      }
    } catch {}

    // 5. If not found, download latest yt-dlp binary from GitHub
    return await this.downloadYtDlpBinary();
  }

  /**
   * Download yt-dlp standalone binary from GitHub Releases
   */
  async downloadYtDlpBinary() {
    if (this.isDownloadingYtDlp) {
      // Wait if already downloading
      while (this.isDownloadingYtDlp) {
        await new Promise(r => setTimeout(r, 200));
      }
      if (this.cachedYtDlpPath && fs.existsSync(this.cachedYtDlpPath)) {
        return this.cachedYtDlpPath;
      }
    }

    this.isDownloadingYtDlp = true;
    try {
      const isWin = process.platform === 'win32';
      const isMac = process.platform === 'darwin';
      let assetFileName = 'yt-dlp';
      if (isWin) assetFileName = 'yt-dlp.exe';
      else if (isMac) assetFileName = 'yt-dlp_macos';

      const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${assetFileName}`;
      const targetDir = path.join(this.userDataPath, 'bin');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetPath = path.join(targetDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');
      const tempPath = `${targetPath}.tmp`;

      console.log(`[MediaEngine] Downloading yt-dlp binary from ${downloadUrl} to ${targetPath}...`);

      await this.downloadFileWithRedirects(downloadUrl, tempPath);

      if (fs.existsSync(tempPath)) {
        fs.renameSync(tempPath, targetPath);
        if (!isWin) {
          fs.chmodSync(targetPath, 0o755);
        }
        console.log(`[MediaEngine] yt-dlp successfully installed to ${targetPath}`);
        this.cachedYtDlpPath = targetPath;
        return targetPath;
      }
      throw new Error('Failed to install yt-dlp binary.');
    } finally {
      this.isDownloadingYtDlp = false;
    }
  }

  /**
   * Follow HTTP/HTTPS redirects and stream to file
   */
  downloadFileWithRedirects(url, destPath, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        return reject(new Error('Too many redirects while downloading binary'));
      }

      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Voltrex-Loader/1.4.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this.downloadFileWithRedirects(res.headers.location, destPath, maxRedirects - 1));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Server returned status code ${res.statusCode}`));
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => resolve(destPath));
        });
        fileStream.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch {}
          reject(err);
        });
      });

      req.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
    });
  }

  /**
   * Probe a media URL (YouTube, TikTok, Facebook, Reddit, Instagram, etc.)
   */
  async probeMedia(url) {
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new Error('Please enter a valid media URL.');
    }

    const trimmedUrl = url.trim();
    const ytDlp = await this.findYtDlp();

    return new Promise((resolve, reject) => {
      // Arguments to extract full single JSON without downloading
      const args = [
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificates',
        '--js-runtimes', 'node',
        trimmedUrl
      ];

      const proc = spawn(ytDlp, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdoutData = '';
      let stderrData = '';

      proc.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      proc.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          const errSnippet = (stderrData || stdoutData).trim().split('\n').filter(l => l.includes('ERROR:') || l.includes('Error')).join(' ') || stderrData || `Failed to probe media (Exit code ${code})`;
          return reject(new Error(errSnippet));
        }

        try {
          const info = JSON.parse(stdoutData);
          const parsed = this.parseMediaInfo(info, trimmedUrl);
          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`Could not parse media details: ${parseErr.message}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Could not run media engine: ${err.message}`));
      });
    });
  }

  /**
   * Parse raw yt-dlp metadata JSON into clean, UI-ready format
   */
  parseMediaInfo(info, originalUrl) {
    const title = info.title || 'Untitled Media';
    const duration = typeof info.duration === 'number' ? info.duration : 0;
    const durationFormatted = this.formatDuration(duration);
    const uploader = info.uploader || info.channel || info.creator || info.uploader_id || 'Unknown Creator';
    const viewCount = typeof info.view_count === 'number' ? info.view_count : null;
    const platform = info.extractor_key || info.extractor || 'Web Video';

    // Find best thumbnail
    let thumbnail = info.thumbnail;
    if (Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
      // Pick thumbnail with highest resolution or preference
      const sorted = [...info.thumbnails].sort((a, b) => {
        const resA = (a.width || 0) * (a.height || 0) || (a.preference || 0);
        const resB = (b.width || 0) * (b.height || 0) || (b.preference || 0);
        return resB - resA;
      });
      if (sorted[0]?.url) {
        thumbnail = sorted[0].url;
      }
    }

    const formats = Array.isArray(info.formats) ? info.formats : [];

    // Filter available resolutions and audio
    const videoPresets = [];
    const audioPresets = [];
    const hasFfmpeg = Boolean(this.findFfmpeg());

    // Standard video height targets
    const targetHeights = [
      { height: 2160, label: '4K Ultra HD (2160p)', badge: '4K' },
      { height: 1440, label: '2K Quad HD (1440p)', badge: '2K' },
      { height: 1080, label: 'Full HD (1080p)', badge: '1080p', recommended: true },
      { height: 720, label: 'High Definition (720p)', badge: '720p' },
      { height: 480, label: 'Standard (480p)', badge: '480p' },
      { height: 360, label: 'Mobile (360p)', badge: '360p' }
    ];

    // Find highest video height available
    const availableHeights = new Set();
    let maxVideoSize = 0;

    for (const f of formats) {
      if (f.height) {
        availableHeights.add(f.height);
      }
      const sz = f.filesize || f.filesize_approx || 0;
      if (sz > maxVideoSize) maxVideoSize = sz;
    }

    // Always provide Best Available preset
    videoPresets.push({
      id: 'best_quality',
      formatSelector: hasFfmpeg ? 'bestvideo+bestaudio/best' : 'best',
      label: 'Best Available (Auto Max)',
      resolution: 'Max Quality',
      ext: 'mp4',
      badge: 'BEST',
      recommended: availableHeights.size === 0,
      estimatedSize: maxVideoSize || null
    });

    for (const target of targetHeights) {
      // Check if this or a close height is available in formats
      const isAvailable = Array.from(availableHeights).some(h => Math.abs(h - target.height) <= 30 || h >= target.height);
      if (isAvailable || availableHeights.size === 0) {
        // Calculate estimated size for this height
        let matchedFormat = formats.find(f => f.height === target.height && f.vcodec !== 'none');
        let estimatedSize = matchedFormat ? (matchedFormat.filesize || matchedFormat.filesize_approx) : null;

        videoPresets.push({
          id: `video_${target.height}p`,
          formatSelector: hasFfmpeg
            ? `bestvideo[height<=${target.height}]+bestaudio/best[height<=${target.height}]/best`
            : `best[height<=${target.height}]/best`,
          label: target.label,
          resolution: `${target.height}p`,
          ext: 'mp4',
          badge: target.badge,
          recommended: target.recommended && isAvailable,
          estimatedSize: estimatedSize || null
        });
      }
    }

    // Audio Presets
    audioPresets.push({
      id: 'audio_mp3_best',
      formatSelector: 'bestaudio/best',
      audioFormat: 'mp3',
      label: 'MP3 Audio (High Quality 320kbps)',
      ext: 'mp3',
      badge: 'MP3',
      recommended: true,
      audioOnly: true
    });

    audioPresets.push({
      id: 'audio_m4a_best',
      formatSelector: 'bestaudio[ext=m4a]/bestaudio/best',
      audioFormat: 'm4a',
      label: 'M4A / AAC Audio (Original Apple Audio)',
      ext: 'm4a',
      badge: 'M4A',
      audioOnly: true
    });

    audioPresets.push({
      id: 'audio_wav_lossless',
      formatSelector: 'bestaudio/best',
      audioFormat: 'wav',
      label: 'WAV Lossless Audio',
      ext: 'wav',
      badge: 'WAV',
      audioOnly: true
    });

    return {
      success: true,
      id: info.id || `media_${Date.now()}`,
      title,
      uploader,
      duration,
      durationFormatted,
      viewCount,
      thumbnail,
      platform,
      url: info.webpage_url || originalUrl,
      videoPresets,
      audioPresets,
      hasFfmpeg,
      suggestedFileName: `${this.sanitizeFileName(title)}.mp4`
    };
  }

  /**
   * Start executing a media download task via yt-dlp
   */
  async startMediaDownload(task) {
    const ytDlp = await this.findYtDlp();
    const ffmpegPath = this.findFfmpeg();

    const isAudioOnly = Boolean(task.audioOnly);
    const chosenFormat = task.formatSelector || (isAudioOnly ? 'bestaudio/best' : 'bestvideo+bestaudio/best');
    const audioExt = task.audioFormat || 'mp3';
    const outputExt = isAudioOnly ? audioExt : (task.ext || 'mp4');

    const rawBaseName = path.parse(task.fileName || task.title || 'media').name;
    const sanitizedBase = this.sanitizeFileName(rawBaseName);
    const outputTemplate = path.join(task.savePath, `${sanitizedBase}.%(ext)s`);

    // Ensure save directory exists
    try {
      if (!fs.existsSync(task.savePath)) {
        fs.mkdirSync(task.savePath, { recursive: true });
      }
    } catch (err) {
      task.status = 'ERROR';
      task.error = `Failed to create save folder: ${err.message}`;
      this.emit('task-error', { taskId: task.id, error: task.error });
      return;
    }

    const args = [
      '--newline',
      '--no-playlist',
      '--no-check-certificates',
      '--js-runtimes', 'node',
      '--progress-template', 'download-progress:%(progress._percent_str)s|%(progress.downloaded_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s',
      '-f', chosenFormat,
      '-o', outputTemplate
    ];

    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath);
    }

    if (isAudioOnly) {
      args.push('-x', '--audio-format', audioExt, '--audio-quality', '0');
    } else if (ffmpegPath) {
      args.push('--merge-output-format', outputExt);
    }

    args.push(task.url);

    console.log(`[MediaEngine] Starting media download: ${ytDlp} ${args.join(' ')}`);

    const proc = spawn(ytDlp, args, {
      cwd: task.savePath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.activeProcesses.set(task.id, proc);

    let stderrBuffer = '';
    let lastEmitTime = 0;
    let finalDetectedFilePath = null;

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split(/\r?\n/);

      for (const line of lines) {
        if (!line.trim()) continue;

        // Check for download progress template
        if (line.startsWith('download-progress:')) {
          const raw = line.slice('download-progress:'.length);
          const parts = raw.split('|');
          if (parts.length >= 5) {
            const percentStr = parts[0].trim().replace('%', '');
            const downloadedBytes = parseInt(parts[1], 10);
            const totalBytesEst = parseInt(parts[2], 10);
            const speed = parseFloat(parts[3]);
            const eta = parseInt(parts[4], 10);

            if (!isNaN(percentStr)) {
              task.progress = Math.min(100, Math.max(0, parseFloat(percentStr) || 0));
            }
            if (!isNaN(downloadedBytes) && downloadedBytes > 0) {
              task.downloadedBytes = downloadedBytes;
            }
            if (!isNaN(totalBytesEst) && totalBytesEst > 0) {
              task.totalBytes = totalBytesEst;
            } else if (!task.totalBytes && task.downloadedBytes && task.progress > 0) {
              task.totalBytes = Math.round((task.downloadedBytes / task.progress) * 100);
            }
            if (!isNaN(speed) && speed > 0) {
              task.speed = Math.round(speed);
            }
            if (!isNaN(eta) && eta >= 0) {
              task.eta = eta;
            }

            const now = Date.now();
            if (now - lastEmitTime > 250) {
              lastEmitTime = now;
              task.updatedAt = new Date().toISOString();
              this.emit('task-updated', task);
            }
          }
        } else if (line.includes('[download] Destination:')) {
          const destPart = line.split('[download] Destination:')[1]?.trim();
          if (destPart) {
            finalDetectedFilePath = path.isAbsolute(destPart) ? destPart : path.join(task.savePath, destPart);
            task.filePath = finalDetectedFilePath;
            task.fileName = path.basename(finalDetectedFilePath);
          }
        } else if (line.includes('[Merger] Merging formats into')) {
          const match = line.match(/into "([^"]+)"/);
          if (match && match[1]) {
            finalDetectedFilePath = path.isAbsolute(match[1]) ? match[1] : path.join(task.savePath, match[1]);
            task.filePath = finalDetectedFilePath;
            task.fileName = path.basename(finalDetectedFilePath);
          }
        } else if (line.includes('[ExtractAudio] Destination:')) {
          const destPart = line.split('[ExtractAudio] Destination:')[1]?.trim();
          if (destPart) {
            finalDetectedFilePath = path.isAbsolute(destPart) ? destPart : path.join(task.savePath, destPart);
            task.filePath = finalDetectedFilePath;
            task.fileName = path.basename(finalDetectedFilePath);
          }
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
    });

    proc.on('close', (code) => {
      this.activeProcesses.delete(task.id);

      if (task.status === 'PAUSED' || task.status === 'CANCELLED') {
        return;
      }

      if (code === 0) {
        task.status = 'COMPLETED';
        task.progress = 100;
        task.speed = 0;
        task.eta = 0;
        task.completedAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();

        // Check if detected file exists, or verify expected file
        if (!finalDetectedFilePath || !fs.existsSync(finalDetectedFilePath)) {
          // Check if any matching file was created with the base name
          try {
            const files = fs.readdirSync(task.savePath);
            const found = files.find(f => f.startsWith(sanitizedBase) && !f.endsWith('.part') && !f.endsWith('.ytdl'));
            if (found) {
              finalDetectedFilePath = path.join(task.savePath, found);
            }
          } catch {}
        }

        if (finalDetectedFilePath && fs.existsSync(finalDetectedFilePath)) {
          task.filePath = finalDetectedFilePath;
          task.fileName = path.basename(finalDetectedFilePath);
          try {
            const st = fs.statSync(finalDetectedFilePath);
            task.totalBytes = st.size;
            task.downloadedBytes = st.size;
          } catch {}
        }

        this.emit('task-completed', task);
      } else {
        const errorMsg = stderrBuffer.trim().split('\n').filter(l => l.includes('ERROR:')).join(' ') || stderrBuffer.trim() || `Download process exited with code ${code}`;
        task.status = 'ERROR';
        task.error = errorMsg;
        task.speed = 0;
        task.eta = 0;
        task.updatedAt = new Date().toISOString();
        this.emit('task-error', { taskId: task.id, error: task.error });
      }
    });

    proc.on('error', (err) => {
      this.activeProcesses.delete(task.id);
      task.status = 'ERROR';
      task.error = err.message;
      task.speed = 0;
      task.eta = 0;
      this.emit('task-error', { taskId: task.id, error: task.error });
    });
  }

  /**
   * Pause an active media download process
   */
  pauseMedia(taskId) {
    const proc = this.activeProcesses.get(taskId);
    if (proc) {
      try {
        proc.kill('SIGTERM');
      } catch {}
      this.activeProcesses.delete(taskId);
    }
  }

  /**
   * Cancel an active media download process
   */
  cancelMedia(taskId) {
    const proc = this.activeProcesses.get(taskId);
    if (proc) {
      try {
        proc.kill('SIGKILL');
      } catch {}
      this.activeProcesses.delete(taskId);
    }
  }

  /**
   * Delete media task and optionally remove files from disk
   */
  deleteMedia(taskId, deleteFromDisk = false, savePath = null, filePath = null) {
    this.cancelMedia(taskId);

    if (deleteFromDisk) {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        // Also clean up any lingering .part files
        if (filePath && fs.existsSync(`${filePath}.part`)) {
          fs.unlinkSync(`${filePath}.part`);
        }
      } catch (err) {
        console.warn(`[MediaEngine] Could not delete disk file: ${err.message}`);
      }
    }
  }

  /**
   * Cleanup any active processes on shutdown
   */
  destroy() {
    for (const [taskId, proc] of this.activeProcesses.entries()) {
      try {
        proc.kill('SIGKILL');
      } catch {}
    }
    this.activeProcesses.clear();
  }
}

module.exports = { MediaEngine };
