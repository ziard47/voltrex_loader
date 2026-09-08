const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const toggleCapture = document.getElementById('toggle-capture');
const urlInput = document.getElementById('url-input');
const btnSend = document.getElementById('btn-send');
const msgFeedback = document.getElementById('msg-feedback');

// Check desktop app status
function updateStatus() {
  chrome.runtime.sendMessage({ action: 'checkStatus' }, (response) => {
    if (chrome.runtime.lastError || !response?.online) {
      statusPill.className = 'status-pill offline';
      statusText.textContent = 'Offline';
    } else {
      statusPill.className = 'status-pill online';
      statusText.textContent = 'Connected';
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
