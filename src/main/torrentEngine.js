const { EventEmitter } = require('node:events');
const path = require('node:path');
const fs = require('node:fs');

/**
 * TorrentEngine
 * High-performance BitTorrent client integration for Voltrex Loader using WebTorrent and parse-torrent.
 */
class TorrentEngine extends EventEmitter {
  constructor({ userDataPath, defaultDownloadPath, getSettings }) {
    super();
    this.userDataPath = userDataPath;
    this.defaultDownloadPath = defaultDownloadPath;
    this.getSettings = typeof getSettings === 'function' ? getSettings : () => ({});

    this.client = null;
    this.webtorrentModule = null;
    this.parseTorrentModule = null;
    this.throttleGroupModule = null;
    this.trackerClientModule = null;
    this.activeTorrents = new Map(); // taskId -> torrent instance
    this.taskMap = new Map(); // infoHash -> taskId
    this.isInitializing = false;
  }

  /**
   * Lazily load ESM modules (webtorrent and parse-torrent) and support libraries
   */
  async loadModules() {
    if (!this.webtorrentModule) {
      const wt = await import('webtorrent');
      this.webtorrentModule = wt.default || wt;
    }
    if (!this.parseTorrentModule) {
      const pt = await import('parse-torrent');
      this.parseTorrentModule = pt.default || pt;
    }
    if (!this.throttleGroupModule) {
      const sl = require('speed-limiter');
      this.throttleGroupModule = sl.ThrottleGroup;
    }
    if (!this.trackerClientModule) {
      try {
        const bt = await import('bittorrent-tracker');
        this.trackerClientModule = bt.Client || bt.default?.Client || bt;
      } catch (err) {
        console.warn('[TorrentEngine] Failed to import bittorrent-tracker:', err.message);
      }
    }
  }

  /**
   * Get or initialize the WebTorrent client instance
   */
  async getClient() {
    if (this.client && !this.client.destroyed) {
      return this.client;
    }

    await this.loadModules();

    const settings = this.getSettings() || {};
    const WebTorrent = this.webtorrentModule;

    const maxConns = Number(settings.torrentMaxConns) || 55;
    const enableDht = settings.torrentDht !== false;
    const downloadLimit = Number(settings.torrentDownloadLimitKBps) > 0 ? settings.torrentDownloadLimitKBps * 1024 : -1;
    const uploadLimit = Number(settings.torrentUploadLimitKBps) > 0 ? settings.torrentUploadLimitKBps * 1024 : -1;

    this.client = new WebTorrent({
      maxConns,
      dht: enableDht,
      tracker: true,
      webSeeds: true,
      downloadLimit,
      uploadLimit
    });

    this.client.on('error', (err) => {
      console.error('[TorrentEngine] WebTorrent client error:', err.message);
    });

    return this.client;
  }

  /**
   * Parse / probe a torrent source (magnet link, file path, base64 buffer, or URL)
   */
  async probe(source) {
    if (!source) {
      throw new Error('No torrent source provided.');
    }

    await this.loadModules();
    const parseTorrent = this.parseTorrentModule;

    let input = source;

    // Check if source is a file path
    if (typeof source === 'string' && !source.startsWith('magnet:') && !source.startsWith('http://') && !source.startsWith('https://')) {
      if (fs.existsSync(source)) {
        input = fs.readFileSync(source);
      }
    }

    // Check if source is an HTTP / HTTPS link to a .torrent file
    if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://')) && (source.endsWith('.torrent') || source.includes('.torrent?'))) {
      const res = await fetch(source, {
        headers: { 'User-Agent': 'VoltrexLoader/1.2 BitTorrent' }
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch .torrent file: HTTP ${res.status}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      input = Buffer.from(arrayBuffer);
    }

    // Check if source is base64 encoded torrent buffer
    if (typeof source === 'object' && source.bufferBase64) {
      input = Buffer.from(source.bufferBase64, 'base64');
    }

    let parsed;
    try {
      parsed = await parseTorrent(input);
    } catch (err) {
      throw new Error(`Could not parse torrent source: ${err.message}`);
    }

    if (!parsed || !parsed.infoHash) {
      throw new Error('Invalid torrent or magnet data: infoHash missing.');
    }

    const files = Array.isArray(parsed.files)
      ? parsed.files.map((f, idx) => ({
          index: idx,
          name: f.name || path.basename(f.path || `file_${idx}`),
          path: f.path || f.name || `file_${idx}`,
          length: Number(f.length) || 0
        }))
      : [];

    const totalSize = Number(parsed.length) || files.reduce((acc, f) => acc + f.length, 0);
    const magnetUri = parsed.magnetURI || (typeof source === 'string' && source.startsWith('magnet:') ? source : `magnet:?xt=urn:btih:${parsed.infoHash}`);

    // If it's a magnet with no files list and length is 0, attempt a brief DHT probe to fetch metadata
    if (files.length === 0 && (!totalSize || totalSize === 0) && (typeof source === 'string' && source.startsWith('magnet:'))) {
      try {
        const metadata = await this.quickProbeMagnetMetadata(source, parsed.infoHash);
        if (metadata) {
          return {
            isTorrent: true,
            name: metadata.name || parsed.name || `torrent_${parsed.infoHash.substring(0, 8)}`,
            totalSize: metadata.totalSize || 0,
            infoHash: parsed.infoHash,
            magnetUri,
            files: metadata.files || [],
            pieceLength: metadata.pieceLength || parsed.pieceLength || 0,
            piecesCount: metadata.piecesCount || (parsed.pieces ? parsed.pieces.length : 0),
            trackers: parsed.announce || []
          };
        }
      } catch {}
    }

    return {
      isTorrent: true,
      name: parsed.name || (files.length > 0 ? files[0].name : `torrent_${parsed.infoHash.substring(0, 8)}`),
      totalSize,
      infoHash: parsed.infoHash,
      magnetUri,
      files,
      pieceLength: Number(parsed.pieceLength) || 0,
      piecesCount: parsed.pieces ? parsed.pieces.length : 0,
      trackers: parsed.announce || []
    };
  }

  /**
   * Extract infoHash from a magnet URI or URL string
   */
  extractInfoHash(url) {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Synchronously find a torrent in the WebTorrent client by infoHash
   */
  getTorrent(infoHash) {
    if (!this.client || !Array.isArray(this.client.torrents) || !infoHash) return null;
    const target = infoHash.toLowerCase();
    return this.client.torrents.find((t) => t.infoHash && t.infoHash.toLowerCase() === target) || null;
  }

  /**
   * Fast DHT metadata probe for magnet links
   */
  async quickProbeMagnetMetadata(magnetUri, infoHash, timeoutMs = 8000) {
    const client = await this.getClient();

    // If torrent is already active in client, read directly from it
    const existing = this.getTorrent(infoHash);
    if (existing && existing.metadata) {
      return {
        name: existing.name,
        totalSize: existing.length,
        pieceLength: existing.pieceLength,
        piecesCount: existing.pieces ? existing.pieces.length : 0,
        files: (existing.files || []).map((f, idx) => ({
          index: idx,
          name: f.name,
          path: f.path,
          length: f.length
        }))
      };
    }

    return new Promise((resolve) => {
      let probeTorrent = null;
      let timer = null;
      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (probeTorrent) {
          const hash = probeTorrent.infoHash || infoHash;
          if (hash && !this.taskMap.has(hash)) {
            this.safeRemoveTorrent(probeTorrent, { destroyStore: true });
          }
        }
      };

      timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeoutMs);

      try {
        probeTorrent = client.add(magnetUri, {
          path: path.join(this.userDataPath, 'temp_torrent_probe'),
          paused: true,
          destroyStoreOnDestroy: true
        });

        probeTorrent.on('error', () => {
          // Swallow any probe error to avoid unhandled EventEmitter exceptions
        });

        probeTorrent.once('metadata', () => {
          const result = {
            name: probeTorrent.name,
            totalSize: probeTorrent.length,
            pieceLength: probeTorrent.pieceLength,
            piecesCount: probeTorrent.pieces ? probeTorrent.pieces.length : 0,
            files: (probeTorrent.files || []).map((f, idx) => ({
              index: idx,
              name: f.name,
              path: f.path,
              length: f.length
            }))
          };
          cleanup();
          resolve(result);
        });

        probeTorrent.once('error', () => {
          cleanup();
          resolve(null);
        });
      } catch {
        cleanup();
        resolve(null);
      }
    });
  }

  /**
   * Start or attach a torrent task
   */
  async startTorrent(task) {
    if (!task) return;

    const client = await this.getClient();

    if (!task.infoHash) {
      task.infoHash = this.extractInfoHash(task.magnetUri || task.url);
    }

    let torrent = this.getTorrent(task.infoHash);

    if (torrent) {
      if (torrent.paused) {
        try {
          torrent.resume();
        } catch {}
      }
      this.activeTorrents.set(task.id, torrent);
      if (torrent.infoHash) {
        this.taskMap.set(torrent.infoHash.toLowerCase(), task.id);
      }
      this.applyTorrentSpeedLimitsToInstance(torrent, task);
      return torrent;
    }

    // Determine torrent ID: prefer magnetUri, then local torrent file buffer/path, then url
    let torrentId = task.magnetUri || task.url;
    if (task.torrentFilePath && fs.existsSync(task.torrentFilePath)) {
      torrentId = fs.readFileSync(task.torrentFilePath);
    }

    // Ensure download directory exists
    try {
      if (!fs.existsSync(task.savePath)) {
        fs.mkdirSync(task.savePath, { recursive: true });
      }
    } catch (err) {
      console.error('[TorrentEngine] Failed to create destination folder:', err);
    }

    // Prepare announce list with any custom trackers configured on task
    const customAnnounce = Array.isArray(task.trackers) && task.trackers.length > 0 ? task.trackers : undefined;

    try {
      torrent = client.add(torrentId, {
        path: task.savePath,
        paused: false,
        announce: customAnnounce
      });
    } catch (err) {
      torrent = this.getTorrent(task.infoHash);
      if (!torrent) {
        console.error('[TorrentEngine] Error adding torrent to client:', err);
        task.status = 'ERROR';
        task.error = err.message;
        this.emit('task-error', { taskId: task.id, error: err.message });
        return null;
      }
    }

    this.activeTorrents.set(task.id, torrent);
    if (torrent.infoHash) {
      task.infoHash = torrent.infoHash;
      this.taskMap.set(torrent.infoHash.toLowerCase(), task.id);
    }

    // Apply per-torrent download & upload speed limits
    this.applyTorrentSpeedLimitsToInstance(torrent, task);

    torrent.once('infoHash', () => {
      if (torrent.infoHash) {
        task.infoHash = torrent.infoHash;
        this.taskMap.set(torrent.infoHash.toLowerCase(), task.id);
      }
    });

    // Apply file selection if specified
    const applyFileSelection = () => {
      if (torrent.files && torrent.files.length > 0 && Array.isArray(task.selectedFileIndices)) {
        torrent.files.forEach((file, idx) => {
          if (task.selectedFileIndices.includes(idx)) {
            file.select();
          } else {
            file.deselect();
          }
        });
      }
    };

    torrent.on('metadata', () => {
      if (!task.fileName || task.fileName.startsWith('torrent_') || task.fileName.startsWith('magnet_')) {
        task.fileName = torrent.name || task.fileName;
      }
      if (!task.totalBytes || task.totalBytes === 0) {
        task.totalBytes = torrent.length || 0;
      }
      if (!task.files || task.files.length === 0) {
        task.files = (torrent.files || []).map((f, idx) => ({
          index: idx,
          name: f.name,
          path: f.path,
          length: f.length,
          downloaded: 0,
          progress: 0,
          selected: Array.isArray(task.selectedFileIndices) ? task.selectedFileIndices.includes(idx) : true
        }));
      }

      // Synchronize discovered trackers with task trackers
      if (Array.isArray(torrent.announce) && torrent.announce.length > 0) {
        const merged = Array.from(new Set([...(task.trackers || []), ...torrent.announce]));
        task.trackers = merged;
      }

      applyFileSelection();
      task.updatedAt = new Date().toISOString();
      this.emit('task-updated', task);
    });

    torrent.on('ready', () => {
      applyFileSelection();
      task.updatedAt = new Date().toISOString();
      this.emit('task-updated', task);
    });

    torrent.on('done', () => {
      task.status = 'COMPLETED';
      task.progress = 100;
      task.downloadedBytes = task.totalBytes || torrent.downloaded;
      task.speed = 0;
      task.uploadSpeed = 0;
      task.eta = 0;
      task.completedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();

      // Check if user configured to stop seeding on download completion
      const settings = this.getSettings() || {};
      if (settings.torrentStopSeedingOnDone) {
        try {
          torrent.pause();
        } catch {}
      }

      this.emit('task-completed', task);
    });

    torrent.on('error', (err) => {
      console.error(`[TorrentEngine] Torrent ${task.id} error:`, err.message);
      task.status = 'ERROR';
      task.error = err.message;
      task.speed = 0;
      task.uploadSpeed = 0;
      task.updatedAt = new Date().toISOString();
      this.emit('task-error', { taskId: task.id, error: err.message });
    });

    torrent.on('warning', (warn) => {
      console.warn(`[TorrentEngine] Torrent ${task.id} warning:`, warn.message || warn);
    });

    return torrent;
  }

  /**
   * Apply per-torrent download & upload speed limits to a torrent instance
   */
  applyTorrentSpeedLimitsToInstance(torrent, task) {
    if (!torrent || !task) return;
    if (!this.throttleGroupModule) {
      const sl = require('speed-limiter');
      this.throttleGroupModule = sl.ThrottleGroup;
    }
    const ThrottleGroup = this.throttleGroupModule;

    const downLimit = Number(task.downloadLimitKBps) > 0 ? Number(task.downloadLimitKBps) * 1024 : -1;
    const upLimit = Number(task.uploadLimitKBps) > 0 ? Number(task.uploadLimitKBps) * 1024 : -1;

    if (!torrent._customThrottleGroups) {
      torrent._customThrottleGroups = {
        down: new ThrottleGroup({ rate: Math.max(0, downLimit), enabled: downLimit > 0 }),
        up: new ThrottleGroup({ rate: Math.max(0, upLimit), enabled: upLimit > 0 })
      };
    } else {
      if (downLimit > 0) {
        torrent._customThrottleGroups.down.setRate(downLimit);
        torrent._customThrottleGroups.down.setEnabled(true);
      } else {
        torrent._customThrottleGroups.down.setEnabled(false);
      }
      if (upLimit > 0) {
        torrent._customThrottleGroups.up.setRate(upLimit);
        torrent._customThrottleGroups.up.setEnabled(true);
      } else {
        torrent._customThrottleGroups.up.setEnabled(false);
      }
    }

    if (!torrent._clientProxied && torrent.client) {
      torrent._clientProxied = true;
      const actualClient = torrent.client;
      torrent.client = new Proxy(actualClient, {
        get(target, prop, receiver) {
          if (prop === 'throttleGroups') {
            if (torrent._customThrottleGroups &&
                (torrent._customThrottleGroups.down.getEnabled() || torrent._customThrottleGroups.up.getEnabled())) {
              return torrent._customThrottleGroups;
            }
            return target.throttleGroups;
          }
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
      });
    }
  }

  /**
   * Set per-torrent speed limits live
   */
  setTorrentSpeedLimits(task, limits = {}) {
    if (!task) return;
    if (limits.downloadLimitKBps !== undefined) {
      task.downloadLimitKBps = Math.max(0, parseInt(limits.downloadLimitKBps, 10) || 0);
    }
    if (limits.uploadLimitKBps !== undefined) {
      task.uploadLimitKBps = Math.max(0, parseInt(limits.uploadLimitKBps, 10) || 0);
    }

    const torrent = this.activeTorrents.get(task.id);
    if (torrent) {
      this.applyTorrentSpeedLimitsToInstance(torrent, task);
    }
  }

  /**
   * Add trackers dynamically to an active or pending torrent
   */
  async addTorrentTrackers(task, newTrackers) {
    if (!task) return [];
    await this.loadModules();

    const rawList = Array.isArray(newTrackers) ? newTrackers : [newTrackers];
    const parsedList = rawList
      .flatMap((t) => String(t || '').split(/[\r\n,;]+/))
      .map((t) => t.trim())
      .filter((t) => t && /^(udp|http|https|ws|wss):\/\//i.test(t));

    if (parsedList.length === 0) {
      return task.trackers || [];
    }

    const currentTrackers = Array.isArray(task.trackers) ? [...task.trackers] : [];
    const added = [];
    for (const tr of parsedList) {
      if (!currentTrackers.includes(tr)) {
        currentTrackers.push(tr);
        added.push(tr);
      }
    }
    task.trackers = currentTrackers;

    const torrent = this.activeTorrents.get(task.id);
    if (torrent) {
      if (Array.isArray(torrent.announce)) {
        torrent.announce = Array.from(new Set([...torrent.announce, ...added]));
      }

      if (torrent.infoHash && this.client && !this.client.destroyed && added.length > 0) {
        const TrackerClient = this.trackerClientModule;
        if (TrackerClient) {
          if (!torrent._dynamicallyAddedTrackers) {
            torrent._dynamicallyAddedTrackers = [];
          }
          for (const trackerUrl of added) {
            try {
              const tc = new TrackerClient({
                infoHash: torrent.infoHash,
                announce: [trackerUrl],
                peerId: this.client.peerId,
                port: this.client.torrentPort,
                userAgent: this.client.userAgent || 'VoltrexLoader'
              });
              tc.on('peer', (peer) => {
                if (torrent && !torrent.destroyed) {
                  try {
                    torrent.addPeer(peer, 'tracker');
                  } catch {}
                }
              });
              tc.on('warning', () => {});
              tc.on('error', () => {});
              tc.start();
              torrent._dynamicallyAddedTrackers.push(tc);
            } catch (err) {
              console.warn('[TorrentEngine] Error starting dynamic tracker:', trackerUrl, err.message);
            }
          }
        }
      }
    }

    return task.trackers;
  }

  /**
   * Get all active & metadata trackers for a torrent
   */
  getTorrentTrackers(task) {
    if (!task) return [];
    const set = new Set(Array.isArray(task.trackers) ? task.trackers : []);
    const torrent = this.activeTorrents.get(task.id);
    if (torrent && Array.isArray(torrent.announce)) {
      torrent.announce.forEach((t) => set.add(t));
    }
    return Array.from(set);
  }

  /**
   * Dynamically update selected file indices for a torrent task
   */
  setTorrentFileSelection(task, selectedIndices) {
    if (!task) return;
    task.selectedFileIndices = Array.isArray(selectedIndices) ? selectedIndices : null;
    if (Array.isArray(task.files)) {
      task.files.forEach((f, idx) => {
        f.selected = !task.selectedFileIndices || task.selectedFileIndices.includes(idx);
      });
    }
    const torrent = this.activeTorrents.get(task.id);
    if (torrent && torrent.files && torrent.files.length > 0) {
      torrent.files.forEach((file, idx) => {
        if (!task.selectedFileIndices || task.selectedFileIndices.includes(idx)) {
          file.select();
        } else {
          file.deselect();
        }
      });
      this.updateTaskStats(task, torrent);
    }
  }

  /**
   * Clean up dynamic tracker clients and custom throttle groups for a torrent
   */
  cleanTorrentResources(torrent) {
    if (!torrent) return;
    if (Array.isArray(torrent._dynamicallyAddedTrackers)) {
      for (const tc of torrent._dynamicallyAddedTrackers) {
        try {
          tc.destroy();
        } catch {}
      }
      torrent._dynamicallyAddedTrackers = null;
    }
    if (torrent._customThrottleGroups) {
      try {
        torrent._customThrottleGroups.down.destroy();
      } catch {}
      try {
        torrent._customThrottleGroups.up.destroy();
      } catch {}
      torrent._customThrottleGroups = null;
    }
  }

  /**
   * Pause an active torrent
   */
  pauseTorrent(taskId) {
    const torrent = this.activeTorrents.get(taskId);
    if (torrent && !torrent.paused) {
      try {
        torrent.pause();
      } catch (err) {
        console.error('[TorrentEngine] Failed to pause torrent:', err);
      }
    }
  }

  /**
   * Resume a paused torrent
   */
  async resumeTorrent(taskId, task) {
    const torrent = this.activeTorrents.get(taskId);
    if (torrent) {
      if (torrent.paused) {
        try {
          torrent.resume();
        } catch (err) {
          console.error('[TorrentEngine] Failed to resume torrent:', err);
        }
      }
      if (task) {
        this.applyTorrentSpeedLimitsToInstance(torrent, task);
      }
      return torrent;
    }

    if (task) {
      return await this.startTorrent(task);
    }
  }

  /**
   * Safely remove a torrent from the WebTorrent client without throwing unhandled rejections
   */
  async safeRemoveTorrent(target, opts = { destroyStore: false }) {
    if (!this.client || this.client.destroyed) return;
    try {
      let torrent = target;
      if (typeof target === 'string') {
        torrent = this.getTorrent(target);
      }
      if (torrent && !torrent.destroyed) {
        this.cleanTorrentResources(torrent);
        await this.client.remove(torrent, opts).catch(() => {});
      }
    } catch {}
  }

  /**
   * Cancel an active torrent
   */
  cancelTorrent(taskId) {
    const torrent = this.activeTorrents.get(taskId);
    if (torrent) {
      this.cleanTorrentResources(torrent);
      this.activeTorrents.delete(taskId);
      const targetHash = torrent.infoHash;
      if (targetHash) {
        this.taskMap.delete(targetHash);
        this.safeRemoveTorrent(targetHash, { destroyStore: false });
      }
    }
  }

  /**
   * Delete a torrent and optionally delete files from disk
   */
  deleteTorrent(taskId, infoHash, deleteFromDisk = false, savePath = null, fileName = null) {
    const torrent = this.activeTorrents.get(taskId);
    const targetHash = torrent?.infoHash || infoHash;

    if (torrent) {
      this.cleanTorrentResources(torrent);
      this.activeTorrents.delete(taskId);
    }
    if (targetHash) {
      this.taskMap.delete(targetHash);
      this.safeRemoveTorrent(targetHash, { destroyStore: deleteFromDisk });
    }

    // Safety fallback: if user requested disk deletion, make sure the target file or directory is removed
    if (deleteFromDisk && savePath && fileName) {
      try {
        const targetPath = path.join(savePath, fileName);
        if (fs.existsSync(targetPath)) {
          const stats = fs.statSync(targetPath);
          if (stats.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(targetPath);
          }
        }
      } catch (err) {
        console.error('[TorrentEngine] Failed to delete torrent files from disk:', err);
      }
    }
  }

  /**
   * Update task telemetry and piece matrix
   */
  updateTaskStats(task) {
    if (!task) return;
    const torrent = this.activeTorrents.get(task.id);
    if (!torrent) return;

    task.downloadedBytes = torrent.downloaded || 0;
    if (torrent.length && (!task.totalBytes || task.totalBytes === 0)) {
      task.totalBytes = torrent.length;
    }
    task.totalBytes = task.totalBytes || torrent.length || 0;

    const progressRatio = task.totalBytes > 0 ? task.downloadedBytes / task.totalBytes : (torrent.progress || 0);
    task.progress = Math.min(100, Math.round(progressRatio * 10000) / 100);

    task.speed = torrent.downloadSpeed || 0;
    task.uploadSpeed = torrent.uploadSpeed || 0;
    task.peers = torrent.numPeers || 0;
    task.eta = torrent.timeRemaining ? Math.round(torrent.timeRemaining / 1000) : 0;

    // Synchronize individual file progress
    if (torrent.files && torrent.files.length > 0) {
      task.files = torrent.files.map((f, idx) => ({
        index: idx,
        name: f.name,
        path: f.path,
        length: f.length,
        downloaded: typeof f.downloaded === 'function' ? f.downloaded() : (f.downloaded || 0),
        progress: Math.min(100, Math.round((typeof f.progress === 'function' ? f.progress() : (f.progress || 0)) * 100)),
        selected: Array.isArray(task.selectedFileIndices) ? task.selectedFileIndices.includes(idx) : true
      }));

      // If user selected only a subset of files, calculate task progress and totalBytes relative to selected files
      if (Array.isArray(task.selectedFileIndices) && task.selectedFileIndices.length > 0) {
        const selectedFiles = task.files.filter((f) => task.selectedFileIndices.includes(f.index));
        const selectedTotalBytes = selectedFiles.reduce((acc, f) => acc + (f.length || 0), 0);
        const selectedDownloadedBytes = selectedFiles.reduce((acc, f) => acc + (f.downloaded || 0), 0);
        if (selectedTotalBytes > 0) {
          task.totalBytes = selectedTotalBytes;
          task.downloadedBytes = selectedDownloadedBytes;
          const ratio = selectedDownloadedBytes / selectedTotalBytes;
          task.progress = Math.min(100, Math.round(ratio * 10000) / 100);
        }

        // Check if all selected files are completed
        const allSelectedFinished = selectedFiles.length > 0 && selectedFiles.every((f) => f.progress >= 100 || f.downloaded >= f.length);
        if (allSelectedFinished && task.status === 'DOWNLOADING') {
          task.status = 'COMPLETED';
          task.progress = 100;
          task.downloadedBytes = task.totalBytes;
          task.speed = 0;
          task.uploadSpeed = 0;
          task.eta = 0;
          task.completedAt = new Date().toISOString();
          task.updatedAt = new Date().toISOString();
          this.emit('task-completed', task);
        }
      }
    }

    // Generate visual chunks for ChunkMatrix telemetry representation
    task.chunks = this.generatePieceChunks(torrent, task);
  }

  /**
   * Partition torrent pieces into 16 or 32 visual segments for ChunkMatrix
   */
  generatePieceChunks(torrent, task) {
    const numSegments = 24;
    const totalPieces = torrent.pieces ? torrent.pieces.length : (task.piecesCount || 0);

    if (!totalPieces || totalPieces <= 0) {
      // If pieces not known yet, return placeholder queued chunks
      return Array.from({ length: numSegments }, (_, i) => ({
        index: i,
        startByte: 0,
        endByte: 0,
        currentByte: 0,
        downloadedBytes: 0,
        totalBytes: 100,
        progress: 0,
        status: 'QUEUED',
        speed: 0
      }));
    }

    const bitfield = torrent.bitfield;
    const piecesPerSegment = Math.max(1, Math.floor(totalPieces / numSegments));
    const chunks = [];

    for (let i = 0; i < numSegments; i++) {
      const startPiece = i * piecesPerSegment;
      const endPiece = i === numSegments - 1 ? totalPieces : Math.min(totalPieces, (i + 1) * piecesPerSegment);
      const pieceCount = Math.max(1, endPiece - startPiece);

      let completedInSegment = 0;
      if (bitfield) {
        for (let p = startPiece; p < endPiece; p++) {
          if (bitfield.get(p)) {
            completedInSegment++;
          }
        }
      } else if (torrent.done) {
        completedInSegment = pieceCount;
      }

      const segProgress = Math.min(100, Math.round((completedInSegment / pieceCount) * 100));
      let segStatus = 'QUEUED';
      if (segProgress === 100) {
        segStatus = 'COMPLETED';
      } else if (segProgress > 0 || (torrent.downloadSpeed > 0 && i === Math.floor((task.progress / 100) * numSegments))) {
        segStatus = 'DOWNLOADING';
      }

      chunks.push({
        index: i,
        startByte: startPiece,
        endByte: endPiece,
        currentByte: startPiece + completedInSegment,
        downloadedBytes: completedInSegment,
        totalBytes: pieceCount,
        progress: segProgress,
        status: segStatus,
        speed: segStatus === 'DOWNLOADING' ? Math.round(torrent.downloadSpeed / Math.max(1, numSegments / 4)) : 0
      });
    }

    return chunks;
  }

  /**
   * Apply settings live to WebTorrent client
   */
  applySettings(settings = {}) {
    if (!this.client || this.client.destroyed) return;

    if (typeof this.client.throttleDownload === 'function') {
      const downLimit = Number(settings.torrentDownloadLimitKBps) > 0 ? settings.torrentDownloadLimitKBps * 1024 : -1;
      this.client.throttleDownload(downLimit);
    }

    if (typeof this.client.throttleUpload === 'function') {
      const upLimit = Number(settings.torrentUploadLimitKBps) > 0 ? settings.torrentUploadLimitKBps * 1024 : -1;
      this.client.throttleUpload(upLimit);
    }
  }

  /**
   * Destroy client and stop all torrents
   */
  destroy() {
    this.activeTorrents.clear();
    this.taskMap.clear();
    if (this.client && !this.client.destroyed) {
      try {
        this.client.destroy(() => {
          console.log('[TorrentEngine] WebTorrent client destroyed gracefully.');
        });
      } catch {}
    }
    this.client = null;
  }
}

module.exports = { TorrentEngine };
