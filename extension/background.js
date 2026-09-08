const VOLTREX_BASE = 'http://127.0.0.1:9580';

// Check if Voltrex Loader desktop app is running
async function isVoltrexOnline() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${VOLTREX_BASE}/ping`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = await res.json();
    return data.app === 'voltrex-loader';
  } catch {
    return false;
  }
}

// Send download payload to Voltrex Loader
async function sendToVoltrex({ url, fileName, referrer }) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${VOLTREX_BASE}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        fileName: fileName ? fileName.replace(/[\\/:*?"<>|]/g, '_') : undefined,
        referrer,
        autoStart: true
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Setup context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['captureDownloads'], (result) => {
    if (result.captureDownloads === undefined) {
      chrome.storage.local.set({ captureDownloads: true });
    }
  });

  chrome.contextMenus.create({
    id: 'voltrex-download-link',
    title: 'Download with Voltrex Loader',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'voltrex-download-media',
    title: 'Download with Voltrex Loader',
    contexts: ['image', 'video', 'audio']
  });
});

// Context Menu click handler
chrome.contextMenus.onClicked.addListener(async (info) => {
  const targetUrl = info.linkUrl || info.srcUrl;
  if (!targetUrl) return;

  const online = await isVoltrexOnline();
  if (!online) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Voltrex Loader Offline',
      message: 'Please start the Voltrex Loader desktop app to capture downloads.'
    });
    return;
  }

  const result = await sendToVoltrex({ url: targetUrl, fileName: extractUrlFileName(targetUrl) });
  if (result?.success) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Sent to Voltrex Loader',
      message: `Download started: ${result.fileName || targetUrl}`
    });
  } else {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Transfer Failed',
      message: result?.error || 'Could not send download to Voltrex Loader.'
    });
  }
});

// Track intercepted downloads to prevent duplicate processing
const handledUrls = new Map(); // url -> timestamp

// Browser Native Download Interception
chrome.downloads.onCreated.addListener(async (item) => {
  const downloadUrl = item.finalUrl || item.url;

  // Only intercept valid http/https URLs
  if (!downloadUrl || (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://'))) {
    return;
  }

  // Deduplicate rapid duplicate events (within 4 seconds)
  const now = Date.now();
  if (handledUrls.has(downloadUrl) && now - handledUrls.get(downloadUrl) < 4000) {
    return;
  }

  // Check if user has enabled interception
  const config = await chrome.storage.local.get(['captureDownloads']);
  if (config.captureDownloads === false) {
    return;
  }

  // Check if Voltrex Loader is active
  const online = await isVoltrexOnline();
  if (!online) {
    // Let browser download proceed normally
    return;
  }

  // Mark handled
  handledUrls.set(downloadUrl, now);
  // Cleanup old records
  if (handledUrls.size > 100) {
    for (const [key, time] of handledUrls.entries()) {
      if (now - time > 10000) handledUrls.delete(key);
    }
  }

  // Cancel and erase browser native download
  try {
    chrome.downloads.cancel(item.id, () => {
      chrome.downloads.erase({ id: item.id });
    });
  } catch {}

function extractUrlFileName(urlStr) {
  try {
    const parsed = new URL(urlStr);
    for (const key of ['filename', 'file_name', 'name', 'file', 'title', 'fn', 'f']) {
      const val = parsed.searchParams.get(key);
      if (val) {
        const decoded = decodeURIComponent(val.trim()).replace(/[\\/:*?"<>|\r\n]/g, '_');
        if (decoded) return decoded;
      }
    }
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      const decoded = decodeURIComponent(last).replace(/[\\/:*?"<>|\r\n]/g, '_');
      if (decoded && decoded !== '/' && decoded !== '.') return decoded;
    }
  } catch {}
  return '';
}

// Forward to Voltrex Loader desktop app
  const detectedFileName = (item.filename && item.filename.trim()) || extractUrlFileName(downloadUrl);
  const result = await sendToVoltrex({
    url: downloadUrl,
    fileName: detectedFileName,
    referrer: item.referrer
  });

  if (result?.success) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Captured to Voltrex Loader',
      message: `${result.fileName || 'Download'} has been routed to Voltrex Loader.`
    });
  }
});

// Respond to popup messages
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'checkStatus') {
    isVoltrexOnline().then((online) => sendResponse({ online }));
    return true; // Keep channel open for async response
  }
  if (request.action === 'sendUrl') {
    sendToVoltrex({ url: request.url }).then((result) => sendResponse(result));
    return true;
  }
});
