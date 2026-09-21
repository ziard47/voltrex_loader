const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Probing & inspection
  probeUrl: (url) => ipcRenderer.invoke('download:probe-url', url),
  batchProbeUrls: (urls) => ipcRenderer.invoke('download:batch-probe', urls),

  // Download operations
  addDownload: (payload) => ipcRenderer.invoke('download:add', payload),
  addBatchDownloads: (payload) => ipcRenderer.invoke('download:add-batch', payload),
  pauseDownload: (taskId) => ipcRenderer.invoke('download:pause', taskId),
  resumeDownload: (taskId) => ipcRenderer.invoke('download:resume', taskId),
  cancelDownload: (taskId) => ipcRenderer.invoke('download:cancel', taskId),
  deleteDownload: (taskId, deleteFromDisk) => ipcRenderer.invoke('download:delete', { taskId, deleteFromDisk }),
  openFile: (taskId) => ipcRenderer.invoke('download:open-file', taskId),
  showInFolder: (taskId) => ipcRenderer.invoke('download:show-in-folder', taskId),
  setPriority: (taskId, priority) => ipcRenderer.invoke('download:set-priority', { taskId, priority }),

  // Bulk queue operations
  pauseAll: () => ipcRenderer.invoke('download:pause-all'),
  resumeAll: () => ipcRenderer.invoke('download:resume-all'),
  stopAll: () => ipcRenderer.invoke('download:stop-all'),
  clearCompleted: () => ipcRenderer.invoke('download:clear-completed'),
  getAllDownloads: () => ipcRenderer.invoke('download:get-all'),
  setConcurrency: (limit) => ipcRenderer.invoke('download:set-concurrency', limit),
  getDefaultDownloadPath: () => ipcRenderer.invoke('download:get-default-path'),

  // Native Dialogs & Shell
  browseDirectory: (currentPath) => ipcRenderer.invoke('dialog:browse-directory', currentPath),
  openPath: (folderPath) => ipcRenderer.invoke('shell:open-path', folderPath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  getZoomFactor: () => ipcRenderer.invoke('window:get-zoom'),
  setZoomFactor: (zoom) => ipcRenderer.invoke('window:set-zoom', zoom),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),

  // Settings API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (newSettings) => ipcRenderer.invoke('settings:save', newSettings),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),
  showTestNotification: () => ipcRenderer.invoke('notification:test'),
  testProxy: (proxyConfig) => ipcRenderer.invoke('proxy:test', proxyConfig),

  // Event Listeners from Main Process
  onProgressBatch: (callback) => {
    const handler = (_event, batch) => callback(batch);
    ipcRenderer.on('download:progress-batch', handler);
    return () => ipcRenderer.removeListener('download:progress-batch', handler);
  },
  onTaskAdded: (callback) => {
    const handler = (_event, task) => callback(task);
    ipcRenderer.on('download:task-added', handler);
    return () => ipcRenderer.removeListener('download:task-added', handler);
  },
  onTaskUpdated: (callback) => {
    const handler = (_event, task) => callback(task);
    ipcRenderer.on('download:task-updated', handler);
    return () => ipcRenderer.removeListener('download:task-updated', handler);
  },
  onTaskCompleted: (callback) => {
    const handler = (_event, task) => callback(task);
    ipcRenderer.on('download:task-completed', handler);
    return () => ipcRenderer.removeListener('download:task-completed', handler);
  },
  onTaskError: (callback) => {
    const handler = (_event, info) => callback(info);
    ipcRenderer.on('download:task-error', handler);
    return () => ipcRenderer.removeListener('download:task-error', handler);
  },
  onTaskDeleted: (callback) => {
    const handler = (_event, taskId) => callback(taskId);
    ipcRenderer.on('download:task-deleted', handler);
    return () => ipcRenderer.removeListener('download:task-deleted', handler);
  },
  onTasksCleared: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('download:tasks-cleared', handler);
    return () => ipcRenderer.removeListener('download:tasks-cleared', handler);
  },
  onCapturedDownload: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('download:captured-prompt', handler);
    return () => ipcRenderer.removeListener('download:captured-prompt', handler);
  },
  onTrayOpenAddModal: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:open-add-modal', handler);
    return () => ipcRenderer.removeListener('tray:open-add-modal', handler);
  },
  onTrayOpenSettings: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray:open-settings', handler);
    return () => ipcRenderer.removeListener('tray:open-settings', handler);
  },
  onSettingsUpdated: (callback) => {
    const handler = (_event, settings) => callback(settings);
    ipcRenderer.on('settings:updated', handler);
    return () => ipcRenderer.removeListener('settings:updated', handler);
  }
});
