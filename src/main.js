const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { DownloadEngine } = require('./main/downloadEngine');
const { BridgeServer } = require('./main/bridgeServer');

let mainWindow = null;
let downloadEngine = null;
let bridgeServer = null;
let tray = null;
let isQuitting = false;

function showAndFocusMainWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: false,
    maximizable: false,
    minWidth: 1200,
    minHeight: 800,
    maxWidth: 1200,
    maxHeight: 800,
    backgroundColor: '#1D1616',
    title: 'Voltrex Loader',
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  });

  // Determine whether to load from Vite dev server or built bundle
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  const devServerUrl = 'http://localhost:5173';
  const distIndexPath = path.join(__dirname, '../dist/renderer/index.html');
  const fallbackHtmlPath = path.join(__dirname, 'renderer/index.html');

  if (process.env.VITE_DEV === 'true') {
    mainWindow.loadURL(devServerUrl).catch(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (fs.existsSync(distIndexPath)) {
          mainWindow.loadFile(distIndexPath).catch(() => {});
        } else {
          mainWindow.loadFile(fallbackHtmlPath).catch(() => {});
        }
      }
    });
  } else {
    if (fs.existsSync(distIndexPath)) {
      mainWindow.loadFile(distIndexPath).catch(() => {});
    } else {
      mainWindow.loadFile(fallbackHtmlPath).catch(() => {});
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', async (event) => {
    if (isQuitting) return;

    event.preventDefault();

    const settings = loadSettings();
    if (settings.closeAction === 'tray') {
      mainWindow.hide();
      return;
    }
    if (settings.closeAction === 'quit') {
      isQuitting = true;
      if (bridgeServer) bridgeServer.stop();
      app.quit();
      return;
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Exit Voltrex Loader',
      message: 'Close Voltrex Loader?',
      detail: 'Choose whether to close to the system tray (downloads keep running in the background) or close Voltrex Loader completely.',
      buttons: ['Close to System Tray', 'Close Voltrex Loader', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      checkboxLabel: 'Remember my choice',
      checkboxChecked: false,
      noLink: true
    });

    if (result.response === 0) {
      if (result.checkboxChecked) {
        saveSettings({ closeAction: 'tray' });
      }
      mainWindow.hide();
    } else if (result.response === 1) {
      if (result.checkboxChecked) {
        saveSettings({ closeAction: 'quit' });
      }
      isQuitting = true;
      if (bridgeServer) bridgeServer.stop();
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Forward DownloadEngine events to renderer and update tray menu
  const forwardEvent = (channel, ...args) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args);
    }
  };

  downloadEngine.on('progress-batch', (batch) => forwardEvent('download:progress-batch', batch));
  downloadEngine.on('task-added', (task) => {
    forwardEvent('download:task-added', task);
    updateTrayMenu();
  });
  downloadEngine.on('task-updated', (task) => {
    forwardEvent('download:task-updated', task);
    updateTrayMenu();
  });
  downloadEngine.on('task-completed', (task) => {
    forwardEvent('download:task-completed', task);
    updateTrayMenu();
  });
  downloadEngine.on('task-error', (info) => {
    forwardEvent('download:task-error', info);
    updateTrayMenu();
  });
  downloadEngine.on('task-deleted', (taskId) => {
    forwardEvent('download:task-deleted', taskId);
    updateTrayMenu();
  });
  downloadEngine.on('tasks-cleared', () => {
    forwardEvent('download:tasks-cleared');
    updateTrayMenu();
  });
}

// Setup IPC Handlers
function setupIpcHandlers() {
  // Query / Probe URL online status & metadata
  ipcMain.handle('download:probe-url', async (_event, url) => {
    return await downloadEngine.probeUrl(url);
  });

  // Add new download task
  ipcMain.handle('download:add', async (_event, payload) => {
    return await downloadEngine.addDownload(payload);
  });

  // Individual task actions
  ipcMain.handle('download:pause', async (_event, taskId) => {
    return downloadEngine.pauseDownload(taskId);
  });

  ipcMain.handle('download:resume', async (_event, taskId) => {
    return downloadEngine.resumeDownload(taskId);
  });

  ipcMain.handle('download:cancel', async (_event, taskId) => {
    return downloadEngine.cancelDownload(taskId);
  });

  ipcMain.handle('download:delete', async (_event, { taskId, deleteFromDisk }) => {
    return downloadEngine.deleteDownload(taskId, deleteFromDisk);
  });

  ipcMain.handle('download:open-file', async (_event, taskId) => {
    return downloadEngine.openFile(taskId);
  });

  ipcMain.handle('download:show-in-folder', async (_event, taskId) => {
    return downloadEngine.showInFolder(taskId);
  });

  ipcMain.handle('download:set-priority', async (_event, { taskId, priority }) => {
    return downloadEngine.setPriority(taskId, priority);
  });

  // Bulk queue operations
  ipcMain.handle('download:pause-all', async () => {
    downloadEngine.pauseAll();
    return true;
  });

  ipcMain.handle('download:resume-all', async () => {
    downloadEngine.resumeAll();
    return true;
  });

  ipcMain.handle('download:stop-all', async () => {
    downloadEngine.stopAll();
    return true;
  });

  ipcMain.handle('download:clear-completed', async () => {
    downloadEngine.clearCompleted();
    return true;
  });

  ipcMain.handle('download:get-all', async () => {
    return downloadEngine.getAllTasks();
  });

  ipcMain.handle('download:set-concurrency', async (_event, limit) => {
    return downloadEngine.setConcurrency(limit);
  });

  ipcMain.handle('download:get-default-path', async () => {
    return app.getPath('downloads');
  });

  // Native directory picker (cross platform Linux/SteamOS/Windows)
  ipcMain.handle('dialog:browse-directory', async (_event, currentPath) => {
    if (!mainWindow) return null;
    const settings = loadSettings();
    const defaultPath = currentPath || settings.defaultDownloadPath || app.getPath('downloads');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Download Folder',
      defaultPath,
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  // Open directory directly in OS file manager
  ipcMain.handle('shell:open-path', async (_event, folderPath) => {
    if (typeof folderPath === 'string' && fs.existsSync(folderPath)) {
      await shell.openPath(folderPath);
      return true;
    }
    return false;
  });

  // External browser opener
  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return true;
    }
    return false;
  });

  // Settings Management IPC
  ipcMain.handle('settings:get', async () => {
    return loadSettings();
  });

  ipcMain.handle('settings:save', async (_event, newSettings) => {
    return saveSettings(newSettings);
  });

  ipcMain.handle('settings:reset', async () => {
    const defaults = getDefaultSettings();
    return saveSettings(defaults);
  });

  ipcMain.handle('notification:test', async () => {
    const { Notification } = require('electron');
    if (Notification.isSupported()) {
      new Notification({
        title: 'Voltrex Loader',
        body: 'Notifications are functioning properly!'
      }).show();
      return true;
    }
    return false;
  });

  // Proxy Connection Test IPC
  ipcMain.handle('proxy:test', async (_event, proxyConfig) => {
    try {
      const mode = proxyConfig?.proxyMode || 'direct';
      if (mode === 'direct') {
        return { success: true, message: 'Direct connection (no proxy) is active.' };
      }
      if (mode === 'system') {
        return { success: true, message: 'System proxy configuration is active.' };
      }
      const host = (proxyConfig?.proxyHost || '').trim();
      const port = Number(proxyConfig?.proxyPort);
      if (!host || !port) {
        return { success: false, error: 'Proxy server host and port are required.' };
      }
      const net = require('node:net');
      return await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(5000);
        socket.on('connect', () => {
          socket.destroy();
          resolve({ success: true, message: `Connected successfully to proxy at ${host}:${port}` });
        });
        socket.on('timeout', () => {
          socket.destroy();
          resolve({ success: false, error: `Connection to proxy at ${host}:${port} timed out.` });
        });
        socket.on('error', (err) => {
          socket.destroy();
          resolve({ success: false, error: `Connection to proxy failed: ${err.message}` });
        });
        socket.connect(port, host);
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

// Settings helper methods
let settingsPath = null;

function getDefaultSettings() {
  return {
    defaultDownloadPath: app.getPath('downloads'),
    concurrency: 3,
    autoStartDownloads: true,
    organizeByCategory: false,
    speedLimitKBps: 0,
    autoCapturePrompt: true,
    bridgePort: 9580,
    notifyOnComplete: true,
    soundOnComplete: true,
    timeoutSeconds: 30,
    maxRetries: 3,
    closeAction: 'ask',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VoltrexLoader/1.0',
    // Proxy Settings
    proxyMode: 'direct', // 'direct' | 'system' | 'manual'
    proxyProtocol: 'http', // 'http' | 'https' | 'socks5'
    proxyHost: '',
    proxyPort: 8080,
    proxyAuth: false,
    proxyUsername: '',
    proxyPassword: '',
    proxyBypass: '<local>'
  };
}

function applyProxySettings(settings) {
  try {
    const mode = settings.proxyMode || 'direct';
    const ses = session.defaultSession;

    if (mode === 'direct') {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      delete process.env.http_proxy;
      delete process.env.https_proxy;
      delete process.env.ALL_PROXY;
      delete process.env.all_proxy;
      if (ses) {
        ses.setProxy({ proxyRules: '' });
      }
      return;
    }

    if (mode === 'system') {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      delete process.env.http_proxy;
      delete process.env.https_proxy;
      delete process.env.ALL_PROXY;
      delete process.env.all_proxy;
      if (ses) {
        ses.setProxy({ mode: 'system' });
      }
      return;
    }

    if (mode === 'manual') {
      const protocol = settings.proxyProtocol || 'http';
      const host = (settings.proxyHost || '').trim();
      const port = settings.proxyPort || 8080;
      const bypass = settings.proxyBypass || '<local>';

      if (host) {
        const proxyUrl = `${protocol}://${host}:${port}`;
        if (protocol === 'socks5') {
          process.env.ALL_PROXY = proxyUrl;
          process.env.all_proxy = proxyUrl;
        } else {
          process.env.HTTP_PROXY = proxyUrl;
          process.env.HTTPS_PROXY = proxyUrl;
          process.env.http_proxy = proxyUrl;
          process.env.https_proxy = proxyUrl;
        }

        if (ses) {
          ses.setProxy({
            proxyRules: proxyUrl,
            proxyBypassRules: bypass
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to apply proxy settings:', err);
  }
}

function loadSettings() {
  try {
    if (!settingsPath) {
      settingsPath = path.join(app.getPath('userData'), 'voltrex-settings.json');
    }
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      return { ...getDefaultSettings(), ...data };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return getDefaultSettings();
}

function saveSettings(newSettings) {
  try {
    if (!settingsPath) {
      settingsPath = path.join(app.getPath('userData'), 'voltrex-settings.json');
    }
    const current = loadSettings();
    const merged = { ...current, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf8');

    // Apply live changes to download engine
    if (downloadEngine) {
      if (typeof merged.concurrency === 'number') {
        downloadEngine.setConcurrency(merged.concurrency);
      }
      if (merged.defaultDownloadPath) {
        downloadEngine.defaultDownloadPath = merged.defaultDownloadPath;
      }
    }
    applyProxySettings(merged);
    return merged;
  } catch (err) {
    console.error('Failed to save settings:', err);
    throw err;
  }
}

// System Tray Implementation
function updateTrayMenu() {
  if (!tray) return;

  const tasks = downloadEngine ? downloadEngine.getAllTasks() : [];
  const activeTasks = tasks.filter(t => t.status === 'DOWNLOADING');
  const activeCount = activeTasks.length;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Voltrex Loader',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Open Voltrex Loader',
      click: () => showAndFocusMainWindow()
    },
    {
      label: 'Add Download URL...',
      click: () => {
        showAndFocusMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tray:open-add-modal');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Resume All Transfers',
      click: () => {
        if (downloadEngine) downloadEngine.resumeAll();
      }
    },
    {
      label: 'Pause All Transfers',
      click: () => {
        if (downloadEngine) downloadEngine.pauseAll();
      }
    },
    {
      label: 'Stop All Transfers',
      click: () => {
        if (downloadEngine) downloadEngine.stopAll();
      }
    },
    { type: 'separator' },
    {
      label: activeCount > 0 ? `Active: ${activeCount} transfer${activeCount === 1 ? '' : 's'}` : 'Idle (0 active transfers)',
      enabled: false
    },
    {
      label: 'Open Downloads Folder',
      click: async () => {
        const settings = loadSettings();
        const folder = settings.defaultDownloadPath || app.getPath('downloads');
        await shell.openPath(folder);
      }
    },
    {
      label: 'Preferences & Settings...',
      click: () => {
        showAndFocusMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tray:open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Exit Voltrex Loader',
      click: () => {
        isQuitting = true;
        if (bridgeServer) bridgeServer.stop();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(
    activeCount > 0
      ? `Voltrex Loader - ${activeCount} active download${activeCount === 1 ? '' : 's'}`
      : 'Voltrex Loader'
  );
}

function createTray() {
  if (tray) return;

  const iconPath = path.join(__dirname, 'assets/tray-icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    const fallbackPath = path.join(__dirname, '../extension/icons/icon48.png');
    icon = nativeImage.createFromPath(fallbackPath);
  }
  const trayIcon = icon.resize({ width: 20, height: 20 });

  tray = new Tray(trayIcon);
  updateTrayMenu();

  tray.on('click', () => {
    if (!mainWindow) {
      createWindow();
    } else if (mainWindow.isVisible()) {
      if (mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.focus();
      }
    } else {
      showAndFocusMainWindow();
    }
  });

  tray.on('double-click', () => {
    showAndFocusMainWindow();
  });
}

// App lifecycle
app.whenReady().then(() => {
  const userDataPath = app.getPath('userData');
  settingsPath = path.join(userDataPath, 'voltrex-settings.json');
  const initialSettings = loadSettings();
  const defaultDownloadPath = initialSettings.defaultDownloadPath || app.getPath('downloads');

  downloadEngine = new DownloadEngine(userDataPath, defaultDownloadPath);
  if (initialSettings.concurrency) {
    downloadEngine.setConcurrency(initialSettings.concurrency);
  }

  bridgeServer = new BridgeServer(downloadEngine, () => mainWindow, initialSettings.bridgePort || 9580, loadSettings);
  bridgeServer.start();
  applyProxySettings(initialSettings);
  setupIpcHandlers();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      showAndFocusMainWindow();
    }
  });
});

app.on('login', (event, _webContents, _request, authInfo, callback) => {
  if (authInfo.isProxy) {
    const settings = loadSettings();
    if (settings.proxyAuth && settings.proxyUsername) {
      event.preventDefault();
      callback(settings.proxyUsername, settings.proxyPassword || '');
      return;
    }
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (isQuitting) {
    if (bridgeServer) {
      bridgeServer.stop();
    }
    app.quit();
  }
});
