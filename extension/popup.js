const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const toggleCapture = document.getElementById('toggle-capture');
const urlInput = document.getElementById('url-input');
const btnSend = document.getElementById('btn-send');
const msgFeedback = document.getElementById('msg-feedback');

// Direct fetch fallback in case background worker is waking up
async function checkDirectPing() {
  const endpoints = ['http://127.0.0.1:9580/ping', 'http://localhost:9580/ping'];
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(endpoint, { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data && data.app === 'voltrex-loader') return true;
      }
    } catch {}
  }
  return false;
}

// Check desktop app status
function updateStatus() {
  chrome.runtime.sendMessage({ action: 'checkStatus' }, async (response) => {
    let online = !chrome.runtime.lastError && Boolean(response?.online);
    if (!online) {
      online = await checkDirectPing();
    }
    if (online) {
      statusPill.className = 'status-pill online';
      statusText.textContent = 'Connected';
    } else {
      statusPill.className = 'status-pill offline';
      statusText.textContent = 'Offline';
    }
  });
}

// Load storage settings
chrome.storage.local.get(['captureDownloads'], (result) => {
  toggleCapture.checked = result.captureDownloads !== false;
});

toggleCapture.addEventListener('change', () => {
  chrome.storage.local.set({ captureDownloads: toggleCapture.checked });
});

// Send URL to desktop app
async function handleSend() {
  const url = urlInput.value.trim();
  if (!url) {
    showFeedback('Please paste a download URL', 'error');
    return;
  }

  btnSend.disabled = true;
  btnSend.textContent = '...';

  chrome.runtime.sendMessage({ action: 'sendUrl', url }, (res) => {
    btnSend.disabled = false;
    btnSend.textContent = 'Send';

    if (chrome.runtime.lastError || !res?.success) {
      showFeedback(res?.error || 'Failed to connect to Voltrex Loader', 'error');
    } else {
      showFeedback(`Sent: ${res.fileName || 'Download task'}`, 'success');
      urlInput.value = '';
    }
  });
}

btnSend.addEventListener('click', handleSend);
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSend();
});

function showFeedback(text, type) {
  msgFeedback.textContent = text;
  msgFeedback.className = `feedback ${type}`;
  setTimeout(() => {
    msgFeedback.textContent = '';
    msgFeedback.className = 'feedback';
  }, 4000);
}

// Init
updateStatus();
const pollTimer = setInterval(updateStatus, 2500);
window.addEventListener('unload', () => clearInterval(pollTimer));
