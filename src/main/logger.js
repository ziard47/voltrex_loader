const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { shell, dialog } = require('electron');

class Logger extends EventEmitter {
  constructor(userDataPath) {
    super();
    this.userDataPath = userDataPath;
    this.logsDir = path.join(userDataPath, 'logs');
    this.logFilePath = path.join(this.logsDir, 'voltrex.log');
    this.maxMemoryLogs = 2000;
    this.logs = [];
    this.nextId = 1;
    this.writeQueue = [];
    this.isWriting = false;

    this.ensureLogsDir();
    this.initConsoleHook();
  }

  ensureLogsDir() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
      // Check file size, rotate if > 5MB
      if (fs.existsSync(this.logFilePath)) {
        const stats = fs.statSync(this.logFilePath);
        if (stats.size > 5 * 1024 * 1024) {
          const backupPath = path.join(this.logsDir, 'voltrex-prev.log');
          try {
            if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
            fs.renameSync(this.logFilePath, backupPath);
          } catch {}
        }
      }
    } catch (err) {
      // Ignore directory creation failure
    }
  }

  formatTimestamp(date = new Date()) {
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const ms = pad(date.getMilliseconds(), 3);
    const timeFormatted = `${hours}:${minutes}:${seconds}.${ms}`;
    const dateFormatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return {
      iso: date.toISOString(),
      timeFormatted,
      dateFormatted
    };
  }

  addLog(level, category, message, details = null) {
    const ts = this.formatTimestamp();
    const entry = {
      id: this.nextId++,
      timestamp: ts.iso,
      timeFormatted: ts.timeFormatted,
      dateFormatted: ts.dateFormatted,
      level: (level || 'INFO').toUpperCase(),
      category: (category || 'SYSTEM').toUpperCase(),
      message: typeof message === 'string' ? message : JSON.stringify(message),
      details: details && typeof details === 'object' ? details : null
    };

    // Add to in-memory list
    this.logs.push(entry);
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift();
    }

    // Emit event for real-time subscribers
    this.emit('new-entry', entry);

    // Queue for disk write
    const logLine = `[${ts.dateFormatted} ${ts.timeFormatted}] [${entry.level}] [${entry.category}] ${entry.message}${entry.details ? ' ' + JSON.stringify(entry.details) : ''}\n`;
    this.writeQueue.push(logLine);
    this.flushDiskQueue();

    return entry;
  }

  flushDiskQueue() {
    if (this.isWriting || this.writeQueue.length === 0) return;
    this.isWriting = true;

    const chunk = this.writeQueue.join('');
    this.writeQueue = [];

    fs.appendFile(this.logFilePath, chunk, 'utf-8', () => {
      this.isWriting = false;
      if (this.writeQueue.length > 0) {
        this.flushDiskQueue();
      }
    });
  }

  // Convenience methods
  activity(category, message, details) {
    return this.addLog('ACTIVITY', category, message, details);
  }

  info(category, message, details) {
    return this.addLog('INFO', category, message, details);
  }

  warn(category, message, details) {
    return this.addLog('WARN', category, message, details);
  }

  error(category, message, details) {
    return this.addLog('ERROR', category, message, details);
  }

  getLogs({ level, category, search, limit = 1000 } = {}) {
    let result = this.logs;

    if (level && level !== 'ALL') {
      const targetLevel = level.toUpperCase();
      result = result.filter(l => l.level === targetLevel);
    }

    if (category && category !== 'ALL') {
      const targetCat = category.toUpperCase();
      result = result.filter(l => l.category === targetCat);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(l =>
        l.message.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.timeFormatted.includes(q)
      );
    }

    if (limit && typeof limit === 'number' && limit > 0) {
      result = result.slice(-limit);
    }

    return result;
  }

  clearLogs() {
    this.logs = [];
    try {
      fs.writeFileSync(this.logFilePath, '', 'utf-8');
    } catch {}
    this.activity('SYSTEM', 'Cleared application and user activity logs');
    return true;
  }

  async exportLogs(windowRef) {
    try {
      const defaultFileName = `voltrex-logs-${new Date().toISOString().slice(0, 10)}.log`;
      const saveResult = await dialog.showSaveDialog(windowRef, {
        title: 'Export Application Logs',
        defaultPath: path.join(this.userDataPath, defaultFileName),
        filters: [
          { name: 'Log Files (*.log)', extensions: ['log'] },
          { name: 'Text Files (*.txt)', extensions: ['txt'] },
          { name: 'All Files (*.*)', extensions: ['*'] }
        ]
      });

      if (!saveResult.canceled && saveResult.filePath) {
        let content = '';
        if (fs.existsSync(this.logFilePath)) {
          content = fs.readFileSync(this.logFilePath, 'utf-8');
        }
        if (!content && this.logs.length > 0) {
          content = this.logs
            .map(l => `[${l.dateFormatted} ${l.timeFormatted}] [${l.level}] [${l.category}] ${l.message}`)
            .join('\n');
        }
        fs.writeFileSync(saveResult.filePath, content, 'utf-8');
        return { success: true, filePath: saveResult.filePath };
      }
      return { success: false, canceled: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  openLogFolder() {
    try {
      shell.openPath(this.logsDir);
      return true;
    } catch (err) {
      console.error('Failed to open log directory:', err);
      return false;
    }
  }

  initConsoleHook() {
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args) => {
      origLog(...args);
      try {
        const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        // Don't duplicate if already logged by logger
        if (!msg.startsWith('[SchedulerEngine]') && !msg.startsWith('[Main]') && !msg.startsWith('[Renderer')) {
          this.info('SYSTEM', msg);
        } else if (msg.startsWith('[Renderer')) {
          this.info('RENDERER', msg);
        }
      } catch {}
    };

    console.warn = (...args) => {
      origWarn(...args);
      try {
        const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
        this.warn('SYSTEM', msg);
      } catch {}
    };

    console.error = (...args) => {
      origError(...args);
      try {
        const msg = args.map(a => (typeof a === 'string' ? a : a?.message || JSON.stringify(a))).join(' ');
        this.error('SYSTEM', msg);
      } catch {}
    };
  }
}

module.exports = { Logger };
