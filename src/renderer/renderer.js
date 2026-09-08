// DOM elements
const el = {
  badgeElectron: document.getElementById('badge-electron'),
  badgeNode: document.getElementById('badge-node'),
  badgeChrome: document.getElementById('badge-chrome'),
  cpuModel: document.getElementById('cpu-model'),
  cpuCores: document.getElementById('cpu-cores'),
  memUsage: document.getElementById('mem-usage'),
  memProgress: document.getElementById('mem-progress'),
  osPlatform: document.getElementById('os-platform'),
  osHostname: document.getElementById('os-hostname'),
  systemUptime: document.getElementById('system-uptime'),
  localTime: document.getElementById('local-time'),
  consoleLogs: document.getElementById('console-logs'),
  btnRefresh: document.getElementById('btn-refresh'),
  btnDialog: document.getElementById('btn-dialog'),
  btnNotify: document.getElementById('btn-notify'),
  btnDocs: document.getElementById('btn-docs'),
  btnPing: document.getElementById('btn-ping'),
  btnClearLog: document.getElementById('btn-clear-log')
};

// Logger utility
function logMessage(text, type = 'info') {
  if (!el.consoleLogs) return;
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.innerHTML = `<span class="timestamp">[${timeStr}]</span> <span class="log-text">${escapeHtml(text)}</span>`;

  el.consoleLogs.appendChild(line);
  el.consoleLogs.scrollTop = el.consoleLogs.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// Fetch & Update System Info
async function loadSystemInfo() {
  try {
    if (!window.electronAPI) {
      logMessage('electronAPI bridge is not available (running in pure browser?)', 'warning');
      return;
    }

    const info = await window.electronAPI.getSystemInfo();
    
    // Version badges
    el.badgeElectron.textContent = `v${info.versions.electron}`;
    el.badgeNode.textContent = `v${info.versions.node}`;
    el.badgeChrome.textContent = `v${info.versions.chrome}`;

    // CPU
    el.cpuModel.textContent = info.cpuModel;
    el.cpuCores.textContent = `${info.cpuCores} Logical Cores`;

    // Memory
    const totalMem = parseFloat(info.totalMemoryGB);
    const freeMem = parseFloat(info.freeMemoryGB);
    const usedMem = (totalMem - freeMem).toFixed(2);
    const memPercent = Math.round((usedMem / totalMem) * 100);

    el.memUsage.textContent = `${usedMem} / ${totalMem} GB (${memPercent}%)`;
    el.memProgress.style.width = `${memPercent}%`;

    // Platform & Host
    el.osPlatform.textContent = `${info.platform.toUpperCase()} (${info.arch})`;
    el.osHostname.textContent = `${info.hostname} • ${info.osType} ${info.osRelease}`;

    // Uptime
    el.systemUptime.textContent = formatUptime(info.uptimeSeconds);

    logMessage(`System metrics refreshed. Memory usage: ${memPercent}% (${usedMem}/${totalMem} GB)`, 'success');
  } catch (err) {
    logMessage(`Failed to fetch system metrics: ${err.message}`, 'warning');
  }
}

// Realtime clock
function updateClock() {
  if (el.localTime) {
    const now = new Date();
    el.localTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

// Event Listeners
el.btnRefresh?.addEventListener('click', () => {
  logMessage('Manual refresh triggered...', 'action');
  loadSystemInfo();
});

el.btnDialog?.addEventListener('click', async () => {
  logMessage('Invoking native dialog box...', 'action');
  if (window.electronAPI?.showMessageBox) {
    const result = await window.electronAPI.showMessageBox({
      type: 'info',
      title: 'Voltrex Loader IPC Dialog',
      message: 'Secure IPC communication successful!',
      detail: 'This native modal is spawned by the Electron main process via safe contextBridge IPC.'
    });
    logMessage(`Dialog closed with button index: ${result?.response ?? 0}`, 'info');
  }
});

el.btnNotify?.addEventListener('click', async () => {
  logMessage('Sending desktop notification...', 'action');
  if (window.electronAPI?.showNotification) {
    const res = await window.electronAPI.showNotification({
      title: 'Voltrex Loader Alert',
      body: 'Desktop notifications are operational.'
    });
    if (res?.success) {
      logMessage('Notification triggered successfully.', 'success');
    } else {
      logMessage(`Notification warning: ${res?.reason || 'unsupported'}`, 'warning');
    }
  }
});

el.btnDocs?.addEventListener('click', async () => {
  logMessage('Opening Electron documentation in external browser...', 'action');
  if (window.electronAPI?.openExternal) {
    await window.electronAPI.openExternal('https://www.electronjs.org/docs/latest');
  }
});

let pingCount = 0;
el.btnPing?.addEventListener('click', async () => {
  pingCount++;
  const t0 = performance.now();
  if (window.electronAPI?.getSystemInfo) {
    await window.electronAPI.getSystemInfo();
    const latency = (performance.now() - t0).toFixed(2);
    logMessage(`Ping #${pingCount}: IPC round-trip completed in ${latency}ms`, 'info');
  }
});

el.btnClearLog?.addEventListener('click', () => {
  if (el.consoleLogs) {
    el.consoleLogs.innerHTML = '';
    logMessage('Activity console cleared.', 'info');
  }
});

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  logMessage('Renderer UI DOM initialized.', 'info');
  loadSystemInfo();
  updateClock();
  setInterval(updateClock, 1000);
});
