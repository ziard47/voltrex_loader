const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { shell, app, Notification } = require('electron');
const { exec } = require('node:child_process');

class SchedulerEngine extends EventEmitter {
  constructor({ userDataPath, downloadEngine, getSettings }) {
    super();
    this.userDataPath = userDataPath;
    this.downloadEngine = downloadEngine;
    this.getSettings = typeof getSettings === 'function' ? getSettings : () => ({});
    this.storagePath = path.join(userDataPath, 'scheduler-state.json');

    this.queues = new Map();
    this.downloadLimits = {
      enabled: false,
      maxMBytes: 5000,
      perHours: 24,
      speedLimitEnabled: false,
      speedLimitKBps: 500,
      speedLimitFromTime: '08:00:00',
      speedLimitToTime: '20:00:00',
      bytesDownloadedInPeriod: 0,
      periodStartTime: Date.now()
    };

    this.timerInterval = null;
    this.lastTriggerMinute = -1; // To avoid duplicate firing in the same minute
    this.taskRetries = new Map(); // taskId -> retryCount

    this.loadState();
    this.hookDownloadEngine();
    this.startClock();

    // Check if any queue has startOnAppStartup enabled
    setTimeout(() => {
      this.handleAppStartupTrigger();
    }, 3000);
  }

  // --- Initial Default Configuration ---
  createDefaultSchedule(overrides = {}) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      mode: 'one-time', // 'one-time' | 'sync'
      startOnAppStartup: false,
      startEnabled: false,
      startTime: '23:00:00',
      startFrequency: 'daily', // 'once' | 'daily'
      startDate: today,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 0 = Sun, 1 = Mon ... 6 = Sat
      stopEnabled: false,
      stopTime: '07:30:00',
      retryCountEnabled: true,
      retryCount: 10,
      openFileOnDoneEnabled: false,
      openFilePath: '',
      exitOnDone: false,
      turnOffOnDone: false,
      turnOffAction: 'shutdown', // 'shutdown' | 'sleep' | 'hibernate'
      forceProcesses: false,
      syncIntervalMinutes: 60,
      ...overrides
    };
  }

  initDefaultQueues() {
    this.queues.clear();

    // 1. Main Download Queue
    this.queues.set('main', {
      id: 'main',
      name: 'Main download queue',
      type: 'download',
      isDefault: true,
      running: false,
      maxConcurrent: 4,
      taskIds: [],
      schedule: this.createDefaultSchedule()
    });

    // 2. Synchronization Queue
    this.queues.set('sync', {
      id: 'sync',
      name: 'Synchronization queue',
      type: 'sync',
      isDefault: true,
      running: false,
      maxConcurrent: 2,
      taskIds: [],
      schedule: this.createDefaultSchedule({ mode: 'sync' })
    });
  }

  // --- Persistence ---
  saveState() {
    try {
      const data = {
        queues: Array.from(this.queues.values()),
        downloadLimits: this.downloadLimits
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), 'utf-8');
      this.emit('state-updated', this.getState());
    } catch (err) {
      console.error('[SchedulerEngine] Failed to save state:', err);
    }
  }

  loadState() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.queues) && parsed.queues.length > 0) {
          this.queues.clear();
          for (const q of parsed.queues) {
            // Keep running=false on startup
            q.running = false;
            // Ensure schedule fields exist
            q.schedule = { ...this.createDefaultSchedule(), ...(q.schedule || {}) };
            if (!Array.isArray(q.taskIds)) q.taskIds = [];
            this.queues.set(q.id, q);
          }
        } else {
          this.initDefaultQueues();
        }

        if (parsed.downloadLimits) {
          this.downloadLimits = {
            ...this.downloadLimits,
            ...parsed.downloadLimits
          };
        }
      } else {
        this.initDefaultQueues();
        this.saveState();
      }
    } catch (err) {
      console.error('[SchedulerEngine] Failed to load state, restoring defaults:', err);
      this.initDefaultQueues();
    }
  }

  getState() {
    return {
      queues: Array.from(this.queues.values()),
      downloadLimits: this.downloadLimits
    };
  }

  // --- Queue CRUD & Task Association ---
  createQueue({ name, type = 'download' }) {
    const queueName = (name || '').trim() || `Queue ${this.queues.size + 1}`;
    const id = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newQueue = {
      id,
      name: queueName,
      type,
      isDefault: false,
      running: false,
      maxConcurrent: 4,
      taskIds: [],
      schedule: this.createDefaultSchedule({ mode: type === 'sync' ? 'sync' : 'one-time' })
    };

    this.queues.set(id, newQueue);
    this.saveState();
    return newQueue;
  }

  deleteQueue(queueId) {
    const q = this.queues.get(queueId);
    if (!q || q.isDefault) {
      return false; // Cannot delete default queues
    }

    if (q.running) {
      this.stopQueue(queueId);
    }

    this.queues.delete(queueId);
    this.saveState();
    return true;
  }

  saveQueue(queueId, updates) {
    const q = this.queues.get(queueId);
    if (!q) return null;

    if (updates.name && typeof updates.name === 'string') {
      q.name = updates.name.trim();
    }
    if (typeof updates.maxConcurrent === 'number' && updates.maxConcurrent >= 1) {
      q.maxConcurrent = Math.min(16, Math.max(1, updates.maxConcurrent));
    }
    if (updates.schedule) {
      q.schedule = {
        ...q.schedule,
        ...updates.schedule
      };
    }
    if (Array.isArray(updates.taskIds)) {
      q.taskIds = updates.taskIds;
    }

    this.saveState();
    return q;
  }

  addTasksToQueue(queueId, taskIds) {
    const q = this.queues.get(queueId);
    if (!q || !Array.isArray(taskIds)) return false;

    const currentSet = new Set(q.taskIds);
    let changed = false;

    for (const id of taskIds) {
      if (!currentSet.has(id)) {
        q.taskIds.push(id);
        currentSet.add(id);
        changed = true;
      }
    }

    if (changed) {
      this.saveState();
      // If queue is currently running, schedule extra capacity
      if (q.running) {
        this.processQueue(queueId);
      }
    }
    return true;
  }

  removeTaskFromQueue(queueId, taskId) {
    const q = this.queues.get(queueId);
    if (!q) return false;

    const initialLen = q.taskIds.length;
    q.taskIds = q.taskIds.filter(id => id !== taskId);

    if (q.taskIds.length !== initialLen) {
      this.saveState();
      return true;
    }
    return false;
  }

  reorderTasks(queueId, taskIds) {
    const q = this.queues.get(queueId);
    if (!q || !Array.isArray(taskIds)) return false;

    // Filter to only IDs that exist in this queue
    const validIds = new Set(q.taskIds);
    const newOrdered = taskIds.filter(id => validIds.has(id));

    // Append any missing IDs
    for (const existing of q.taskIds) {
      if (!newOrdered.includes(existing)) {
        newOrdered.push(existing);
      }
    }

    q.taskIds = newOrdered;
    this.saveState();
    return true;
  }

  saveDownloadLimits(limits) {
    if (!limits || typeof limits !== 'object') return false;

    this.downloadLimits = {
      ...this.downloadLimits,
      ...limits
    };
    this.saveState();
    return true;
  }

  resetDownloadLimits() {
    this.downloadLimits.bytesDownloadedInPeriod = 0;
    this.downloadLimits.periodStartTime = Date.now();
    this.saveState();
    return true;
  }

  // --- Queue Execution & Concurrency ---
  startQueue(queueId) {
    const q = this.queues.get(queueId);
    if (!q) return false;

    q.running = true;
    this.saveState();
    this.processQueue(queueId);
    return true;
  }

  stopQueue(queueId) {
    const q = this.queues.get(queueId);
    if (!q) return false;

    q.running = false;

    // Pause all tasks currently belonging to this queue
    if (this.downloadEngine && Array.isArray(q.taskIds)) {
      for (const taskId of q.taskIds) {
        const task = this.downloadEngine.tasks?.get(taskId);
        if (task && (task.status === 'DOWNLOADING' || task.status === 'QUEUED' || task.status === 'APPENDING')) {
          this.downloadEngine.pauseDownload(taskId);
        }
      }
    }

    this.saveState();
    return true;
  }

  processQueue(queueId) {
    const q = this.queues.get(queueId);
    if (!q || !q.running || !this.downloadEngine) return;

    // 1. Gather all tasks belonging to this queue
    const queueTasks = [];
    for (const taskId of q.taskIds) {
      const task = this.downloadEngine.tasks?.get(taskId);
      if (task) {
        queueTasks.push(task);
      }
    }

    // 2. Count active running downloads in this queue
    let runningInQueue = 0;
    for (const task of queueTasks) {
      if (task.status === 'DOWNLOADING' || task.status === 'APPENDING' || task.assembling) {
        runningInQueue++;
      }
    }

    // 3. Check for available slots up to queue.maxConcurrent
    const availableSlots = Math.max(0, q.maxConcurrent - runningInQueue);
    if (availableSlots > 0) {
      // Find candidate tasks that can be started: PAUSED, QUEUED, or ERROR
      const candidates = queueTasks.filter(
        t => t.status === 'PAUSED' || t.status === 'QUEUED' || t.status === 'ERROR'
      );

      const toStart = candidates.slice(0, availableSlots);
      for (const t of toStart) {
        if (t.status === 'PAUSED' || t.status === 'ERROR') {
          this.downloadEngine.resumeDownload(t.id);
        } else if (t.status === 'QUEUED') {
          this.downloadEngine.executeDownload(t.id);
        }
      }
    }

    // 4. Check if all tasks in this queue are completed
    this.checkQueueCompletion(q, queueTasks);
  }

  checkQueueCompletion(q, queueTasks) {
    if (!q.running || !queueTasks || queueTasks.length === 0) return;

    const allFinished = queueTasks.every(
      t => t.status === 'COMPLETED' || t.status === 'CANCELLED'
    );

    if (allFinished) {
      console.log(`[SchedulerEngine] All downloads in queue "${q.name}" have completed!`);
      q.running = false;
      this.saveState();

      // Trigger Completion Actions
      this.handleQueueCompletionActions(q);
    }
  }

  handleQueueCompletionActions(q) {
    const s = q.schedule || {};

    // 1. Open file / program when done
    if (s.openFileOnDoneEnabled && s.openFilePath && typeof s.openFilePath === 'string') {
      const trimmedPath = s.openFilePath.trim();
      if (fs.existsSync(trimmedPath)) {
        try {
          shell.openPath(trimmedPath);
        } catch (err) {
          console.error('[SchedulerEngine] Failed to open specified file on completion:', err);
        }
      }
    }

    // 2. Exit Voltrex Loader
    if (s.exitOnDone) {
      console.log('[SchedulerEngine] Exit on done triggered. Quitting app in 2 seconds.');
      setTimeout(() => {
        app.quit();
      }, 2000);
      return;
    }

    // 3. Turn off computer
    if (s.turnOffOnDone) {
      this.executeSystemTurnOff(s.turnOffAction, s.forceProcesses, q.name);
    }
  }

  executeSystemTurnOff(action = 'shutdown', force = false, queueName = 'Main Queue') {
    const actionText = action === 'sleep' ? 'Sleep' : action === 'hibernate' ? 'Hibernate' : 'Shut Down';

    // Show system notification if supported
    try {
      if (Notification.isSupported()) {
        new Notification({
          title: 'Voltrex Loader Scheduler',
          body: `All downloads in "${queueName}" are complete. The computer will ${actionText.toLowerCase()} shortly.`
        }).show();
      }
    } catch {}

    const platform = process.platform;
    let cmd = '';

    if (platform === 'win32') {
      if (action === 'shutdown') {
        cmd = force ? 'shutdown /s /f /t 60' : 'shutdown /s /t 60';
      } else if (action === 'sleep') {
        cmd = 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
      } else if (action === 'hibernate') {
        cmd = 'shutdown /h';
      }
    } else if (platform === 'linux') {
      if (action === 'shutdown') {
        cmd = force ? 'systemctl poweroff -f' : 'systemctl poweroff';
      } else if (action === 'sleep') {
        cmd = 'systemctl suspend';
      } else if (action === 'hibernate') {
        cmd = 'systemctl hibernate';
      }
    } else if (platform === 'darwin') {
      if (action === 'shutdown') {
        cmd = 'osascript -e \'tell app "System Events" to shut down\'';
      } else if (action === 'sleep') {
        cmd = 'pmset sleepnow';
      }
    }

    if (cmd) {
      console.log(`[SchedulerEngine] Executing power command: ${cmd}`);
      exec(cmd, (err) => {
        if (err) {
          console.error('[SchedulerEngine] System power command failed:', err);
        }
      });
    }
  }

  // --- Download Engine Event Hooks ---
  hookDownloadEngine() {
    if (!this.downloadEngine) return;

    this.downloadEngine.on('task-completed', (task) => {
      // Find if this task belongs to any running queue
      for (const q of this.queues.values()) {
        if (q.running && q.taskIds.includes(task.id)) {
          this.processQueue(q.id);
        }
      }
    });

    this.downloadEngine.on('task-error', (info) => {
      const task = info.task || info;
      if (!task || !task.id) return;

      for (const q of this.queues.values()) {
        if (q.running && q.taskIds.includes(task.id)) {
          const maxRetries = q.schedule?.retryCountEnabled ? (q.schedule.retryCount || 10) : 3;
          const curRetries = this.taskRetries.get(task.id) || 0;

          if (curRetries < maxRetries) {
            this.taskRetries.set(task.id, curRetries + 1);
            console.log(`[SchedulerEngine] Retrying task ${task.id} (attempt ${curRetries + 1} of ${maxRetries})...`);
            setTimeout(() => {
              if (q.running && this.downloadEngine) {
                this.downloadEngine.resumeDownload(task.id);
              }
            }, 3000);
          } else {
            // Reached max retries, process next item in queue
            this.processQueue(q.id);
          }
        }
      }
    });

    this.downloadEngine.on('task-deleted', (taskId) => {
      let modified = false;
      for (const q of this.queues.values()) {
        if (q.taskIds.includes(taskId)) {
          q.taskIds = q.taskIds.filter(id => id !== taskId);
          modified = true;
          if (q.running) {
            this.processQueue(q.id);
          }
        }
      }
      if (modified) {
        this.saveState();
      }
    });
  }

  // --- Timer & Schedule Evaluation Clock ---
  startClock() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.evaluateSchedules();
    }, 1000);
  }

  evaluateSchedules() {
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const currentSecond = now.getSeconds();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDateStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    // We trigger minute checks once per minute (at second 0 or first tick of minute)
    const isNewMinute = currentMinute !== this.lastTriggerMinute;
    if (isNewMinute) {
      this.lastTriggerMinute = currentMinute;
    }

    const curTimeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const q of this.queues.values()) {
      const s = q.schedule;
      if (!s) continue;

      // Check Start Schedule
      if (s.startEnabled && s.startTime) {
        const startParts = s.startTime.split(':');
        const startFormatted = `${startParts[0] || '00'}:${startParts[1] || '00'}`;

        if (startFormatted === curTimeFormatted && isNewMinute) {
          let shouldStart = false;

          if (s.startFrequency === 'once') {
            if (s.startDate === currentDateStr) {
              shouldStart = true;
            }
          } else if (s.startFrequency === 'daily') {
            if (Array.isArray(s.daysOfWeek) && s.daysOfWeek.includes(currentDay)) {
              shouldStart = true;
            }
          }

          if (shouldStart && !q.running) {
            console.log(`[SchedulerEngine] Scheduled start time reached for queue "${q.name}". Starting queue...`);
            this.startQueue(q.id);
          }
        }
      }

      // Check Stop Schedule
      if (s.stopEnabled && s.stopTime) {
        const stopParts = s.stopTime.split(':');
        const stopFormatted = `${stopParts[0] || '00'}:${stopParts[1] || '00'}`;

        if (stopFormatted === curTimeFormatted && isNewMinute) {
          if (q.running) {
            console.log(`[SchedulerEngine] Scheduled stop time reached for queue "${q.name}". Stopping queue...`);
            this.stopQueue(q.id);
          }
        }
      }
    }
  }

  handleAppStartupTrigger() {
    for (const q of this.queues.values()) {
      if (q.schedule?.startOnAppStartup && !q.running) {
        console.log(`[SchedulerEngine] Auto-starting queue "${q.name}" on application startup.`);
        this.startQueue(q.id);
      }
    }
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}

module.exports = { SchedulerEngine };
