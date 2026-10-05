const VOLTREX_BASE = 'http://127.0.0.1:9580';

// Track extension background worker boot time to avoid intercepting restored session downloads
const extensionBootTime = Date.now();
const BOOT_GRACE_PERIOD_MS = 3000;

// Track existing downloads on startup so historical downloads are never intercepted
const existingDownloadIds = new Set();
const handledDownloadIds = new Set();
const handledUrls = new Map(); // url -> timestamp

// Pre-populate with all downloads currently in Chrome history/database at extension launch
try {
  chrome.downloads.search({}, (items) => {
    if (items && Array.isArray(items)) {
      for (const d of items) {
        if (d && d.id) {
          existingDownloadIds.add(d.id);
        }
      }
    }
  });
} catch (e) {
  console.warn('[VoltrexExtension] Failed to scan initial downloads:', e);
}

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

function extractUrlFileName(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return '';
  if (urlStr.startsWith('magnet:')) {
    const dnMatch = urlStr.match(/[?&]dn=([^&]+)/i);
    if (dnMatch && dnMatch[1]) {
      try {
        return decodeURIComponent(dnMatch[1].replace(/\+/g, ' ')).replace(/[\\/:*?"<>|\r\n]/g, '_');
      } catch {}
    }
    const xtMatch = urlStr.match(/xt=urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
    if (xtMatch && xtMatch[1]) {
      return `torrent_${xtMatch[1].substring(0, 10)}`;
    }
  }

  try {
    const parsed = new URL(urlStr);
    for (const key of ['dn', 'filename', 'file_name', 'name', 'file', 'title', 'fn', 'f']) {
      const val = parsed.searchParams.get(key);
      if (val) {
        const decoded = decodeURIComponent(val.replace(/\+/g, ' ').trim()).replace(/[\\/:*?"<>|\r\n]/g, '_');
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

// Browser Native Download Interception
chrome.downloads.onCreated.addListener(async (item) => {
  if (!item || !item.id) return;

  // 1. Ignore if download existed prior to or during startup
  if (existingDownloadIds.has(item.id)) {
    return;
  }

  // 2. Ignore if already handled in this session
  if (handledDownloadIds.has(item.id)) {
    return;
  }

  // 3. State check: ONLY intercept brand new downloads in progress
  // Chrome fires onCreated for 'complete' or 'interrupted' downloads during session restore
  if (item.state && item.state !== 'in_progress') {
    existingDownloadIds.add(item.id);
    return;
  }

  // 4. EndTime check: If it has an endTime, it already ended in the past
  if (item.endTime) {
    existingDownloadIds.add(item.id);
    return;
  }

  // 5. StartTime check: Validate download began recently and after extension boot
  if (item.startTime) {
    const itemStart = new Date(item.startTime).getTime();
    const now = Date.now();
    // If it started before the extension booted, or is older than 8 seconds, it is a restored past download
    if (itemStart < extensionBootTime - 1000 || now - itemStart > 8000 || itemStart - now > 8000) {
      existingDownloadIds.add(item.id);
      return;
    }
  }

  // 6. Resume / Paused check: If download was paused or is resumable from a prior session, ignore
  if (item.paused || item.canResume) {
    existingDownloadIds.add(item.id);
    return;
  }

  // 7. Byte count check: Brand new downloads have 0 bytes or very few bytes.
  // If it already received > 256KB, it was previously in-progress
  if (typeof item.bytesReceived === 'number' && item.bytesReceived > 256 * 1024) {
    existingDownloadIds.add(item.id);
    return;
  }

  // 8. Boot grace period: Ignore any events in the first 3 seconds of browser launch
  if (Date.now() - extensionBootTime < BOOT_GRACE_PERIOD_MS) {
    existingDownloadIds.add(item.id);
    return;
  }

  const downloadUrl = item.finalUrl || item.url;

  // 9. URL validation: Only intercept valid http, https, or magnet URLs
  if (!downloadUrl || (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://') && !downloadUrl.startsWith('magnet:'))) {
    return;
  }

  // 10. Deduplicate rapid duplicate events for the same URL (within 4 seconds)
  const now = Date.now();
  if (handledUrls.has(downloadUrl) && now - handledUrls.get(downloadUrl) < 4000) {
    return;
  }

  // 11. Check if user has enabled interception in extension settings
  const config = await chrome.storage.local.get(['captureDownloads']);
  if (config.captureDownloads === false) {
    return;
  }

  // 12. Check if Voltrex Loader desktop app is running
  const online = await isVoltrexOnline();
  if (!online) {
    return;
  }

  // Mark handled
  handledDownloadIds.add(item.id);
  handledUrls.set(downloadUrl, now);

  // Keep handled sets from growing indefinitely
  if (handledUrls.size > 100) {
    for (const [key, time] of handledUrls.entries()) {
      if (now - time > 15000) handledUrls.delete(key);
    }
  }
  if (handledDownloadIds.size > 200) {
    const arr = Array.from(handledDownloadIds);
    arr.slice(0, 100).forEach((id) => handledDownloadIds.delete(id));
  }

  // Cancel and erase browser native download
  try {
    chrome.downloads.cancel(item.id, () => {
      chrome.downloads.erase({ id: item.id });
    });
  } catch {}

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
