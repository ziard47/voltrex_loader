const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { app, shell } = require('electron');

const GITHUB_REPO = 'ziard47/voltrex_loader';
const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

let activeDownloadRequest = null;
let activeDownloadStream = null;
let activeDownloadFilePath = null;

/**
 * Compare two semver version strings (e.g., '1.3.0' vs '1.2.0')
 * Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const clean1 = String(v1).replace(/^v/i, '').trim();
  const clean2 = String(v2).replace(/^v/i, '').trim();

  const parts1 = clean1.split(/[-+]/)[0].split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean2.split(/[-+]/)[0].split('.').map(n => parseInt(n, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Select the best matching release asset for the current operating system
 */
function findAssetForCurrentPlatform(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return null;

  const platform = process.platform; // 'linux', 'win32', 'darwin'
  const isArm = process.arch === 'arm64';

  if (platform === 'linux') {
    // 1. Look for AppImage
    const appImage = assets.find(a => /\.AppImage$/i.test(a.name));
    if (appImage) {
      return {
        name: appImage.name,
        size: appImage.size,
        downloadUrl: appImage.browser_download_url,
        type: 'appimage',
        platform: 'linux'
      };
    }

    // 2. Look for .deb or .tar.gz
    const deb = assets.find(a => /\.deb$/i.test(a.name));
    if (deb) {
      return {
        name: deb.name,
        size: deb.size,
        downloadUrl: deb.browser_download_url,
        type: 'deb',
        platform: 'linux'
      };
    }

    const tar = assets.find(a => /linux.*\.tar\.gz$/i.test(a.name) || /\.tar\.gz$/i.test(a.name));
    if (tar) {
      return {
        name: tar.name,
        size: tar.size,
        downloadUrl: tar.browser_download_url,
        type: 'tar.gz',
        platform: 'linux'
      };
    }
  } else if (platform === 'win32') {
    // 1. Look for Windows setup installer (.exe)
    const setupExe = assets.find(a => /setup.*\.exe$/i.test(a.name) || (/\.exe$/i.test(a.name) && !/\.blockmap$/i.test(a.name)));
    if (setupExe) {
      return {
        name: setupExe.name,
        size: setupExe.size,
        downloadUrl: setupExe.browser_download_url,
        type: 'installer',
        platform: 'win32'
      };
    }

    // 2. Fallback to windows zip package
    const winZip = assets.find(a => /win.*\.zip$/i.test(a.name) || /\.zip$/i.test(a.name));
    if (winZip) {
      return {
        name: winZip.name,
        size: winZip.size,
        downloadUrl: winZip.browser_download_url,
        type: 'zip',
        platform: 'win32'
      };
    }
  } else if (platform === 'darwin') {
    // 1. Look for .dmg
    const dmg = assets.find(a => /\.dmg$/i.test(a.name));
    if (dmg) {
      return {
        name: dmg.name,
        size: dmg.size,
        downloadUrl: dmg.browser_download_url,
        type: 'dmg',
        platform: 'darwin'
      };
    }

    // 2. Look for .zip
    const macZip = assets.find(a => /mac.*\.zip$/i.test(a.name) || /\.zip$/i.test(a.name));
    if (macZip) {
      return {
        name: macZip.name,
        size: macZip.size,
        downloadUrl: macZip.browser_download_url,
        type: 'zip',
        platform: 'darwin'
      };
    }
  }

  // Fallback: any asset matching platform name
  const genericMatch = assets.find(a => a.name.toLowerCase().includes(platform));
  if (genericMatch) {
    return {
      name: genericMatch.name,
      size: genericMatch.size,
      downloadUrl: genericMatch.browser_download_url,
      type: 'generic',
      platform
    };
  }

  return null;
}

/**
 * Check GitHub API for the latest release
 */
async function checkForGitHubUpdate(currentVersion) {
  return new Promise((resolve) => {
    const url = new URL(RELEASES_API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'User-Agent': 'Voltrex-Loader-App',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 10000
    };

    const req = https.get(options, (res) => {
      // Follow redirects if any
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Not typically needed for api.github.com, but safe
        https.get(res.headers.location, { headers: options.headers }, (subRes) => {
          handleResponse(subRes);
        }).on('error', (err) => {
          resolve({ success: false, error: err.message, currentVersion });
        });
        return;
      }

      handleResponse(res);
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message, currentVersion });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Connection timed out while checking for updates.', currentVersion });
    });

    function handleResponse(res) {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            return resolve({
              success: false,
              error: 'No releases found on GitHub repository.',
              currentVersion
            });
          }

          if (res.statusCode === 403) {
            return resolve({
              success: false,
              error: 'GitHub API rate limit exceeded. Please try again later or check releases page.',
              currentVersion
            });
          }

          if (res.statusCode !== 200) {
            return resolve({
              success: false,
              error: `GitHub returned HTTP ${res.statusCode}`,
              currentVersion
            });
          }

          const release = JSON.parse(data);
          const rawTag = release.tag_name || '';
          const latestVersion = rawTag.replace(/^v/i, '').trim();
          const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
          const matchedAsset = findAssetForCurrentPlatform(release.assets);

          resolve({
            success: true,
            updateAvailable,
            currentVersion,
            latestVersion,
            releaseTag: rawTag,
            releaseName: release.name || rawTag,
            releaseNotes: release.body || '',
            publishedAt: release.published_at,
            releaseUrl: release.html_url,
            asset: matchedAsset,
            allAssets: (release.assets || []).map(a => ({
              name: a.name,
              size: a.size,
              downloadUrl: a.browser_download_url
            })),
            platform: process.platform
          });
        } catch (err) {
          resolve({ success: false, error: 'Failed to parse release information: ' + err.message, currentVersion });
        }
      });
    }
  });
}

/**
 * Download a release asset to temporary storage with progress updates
 */
async function downloadUpdateAsset(asset, onProgress) {
  return new Promise((resolve, reject) => {
    if (!asset || !asset.downloadUrl) {
      return reject(new Error('Invalid asset or download URL'));
    }

    const tempDir = app.getPath('temp');
    const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join(tempDir, `voltrex-update-${safeName}`);
    activeDownloadFilePath = targetPath;

    let downloadedBytes = 0;
    let totalBytes = asset.size || 0;
    let lastTime = Date.now();
    let lastDownloaded = 0;
    let currentSpeed = 0;

    const fileStream = fs.createWriteStream(targetPath);
    activeDownloadStream = fileStream;

    function startStreaming(downloadUrl, redirectCount = 0) {
      if (redirectCount > 8) {
        cleanup();
        return reject(new Error('Too many redirects while downloading update asset.'));
      }

      const client = downloadUrl.startsWith('https:') ? https : http;
      const parsedUrl = new URL(downloadUrl);

      const req = client.get(parsedUrl, {
        headers: {
          'User-Agent': 'Voltrex-Loader-App',
          'Accept': 'application/octet-stream'
        }
      }, (res) => {
        // Follow redirects (e.g., GitHub asset download -> AWS S3 redirect)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return startStreaming(res.headers.location, redirectCount + 1);
        }

        if (res.statusCode !== 200) {
          cleanup();
          return reject(new Error(`Download failed with HTTP status ${res.statusCode}`));
        }

        const serverLength = parseInt(res.headers['content-length'], 10);
        if (serverLength && !isNaN(serverLength)) {
          totalBytes = serverLength;
        }

        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          const elapsed = now - lastTime;
          if (elapsed >= 400) {
            const bytesDelta = downloadedBytes - lastDownloaded;
            currentSpeed = Math.round((bytesDelta / elapsed) * 1000);
            lastTime = now;
            lastDownloaded = downloadedBytes;

            const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
            if (typeof onProgress === 'function') {
              onProgress({
                percent,
                downloadedBytes,
                totalBytes,
                speed: currentSpeed,
                status: 'downloading'
              });
            }
          }
        });

        res.on('end', () => {
          fileStream.end(() => {
            activeDownloadRequest = null;
            activeDownloadStream = null;

            if (typeof onProgress === 'function') {
              onProgress({
                percent: 100,
                downloadedBytes: totalBytes || downloadedBytes,
                totalBytes: totalBytes || downloadedBytes,
                speed: 0,
                status: 'completed'
              });
            }

            resolve({
              success: true,
              filePath: targetPath,
              assetName: asset.name,
              assetType: asset.type
            });
          });
        });

        res.on('error', (err) => {
          cleanup();
          reject(err);
        });
      });

      activeDownloadRequest = req;

      req.on('error', (err) => {
        cleanup();
        reject(err);
      });
    }

    function cleanup() {
      if (activeDownloadRequest) {
        try { activeDownloadRequest.destroy(); } catch {}
        activeDownloadRequest = null;
      }
      if (fileStream) {
        try { fileStream.destroy(); } catch {}
      }
      activeDownloadStream = null;
    }

    startStreaming(asset.downloadUrl);
  });
}

/**
 * Cancel any ongoing download
 */
function cancelUpdateDownload() {
  if (activeDownloadRequest) {
    try { activeDownloadRequest.destroy(); } catch {}
    activeDownloadRequest = null;
  }
  if (activeDownloadStream) {
    try { activeDownloadStream.destroy(); } catch {}
    activeDownloadStream = null;
  }
  if (activeDownloadFilePath && fs.existsSync(activeDownloadFilePath)) {
    try { fs.unlinkSync(activeDownloadFilePath); } catch {}
  }
  activeDownloadFilePath = null;
  return true;
}

/**
 * Install the downloaded update according to the host operating system
 */
async function installUpdate(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('Update file not found on disk: ' + filePath);
  }

  const platform = process.platform;

  if (platform === 'linux') {
    // 1. Ensure executable permissions
    try {
      fs.chmodSync(filePath, 0o755);
    } catch (err) {
      console.warn('Could not chmod update file:', err.message);
    }

    // 2. If it is an AppImage, launch the new AppImage and quit the current process
    if (filePath.endsWith('.AppImage') || filePath.endsWith('.appimage')) {
      // Detached spawn
      const child = spawn(filePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      // Gracefully exit Voltrex Loader
      setTimeout(() => {
        app.quit();
      }, 500);
      return { success: true, message: 'Launching updated AppImage and restarting...' };
    }

    // If it is another format (e.g., .deb or .tar.gz), show the file in file manager
    shell.showItemInFolder(filePath);
    return { success: true, message: 'Revealed downloaded Linux package in file manager.' };
  } else if (platform === 'win32') {
    // Windows: If it's an executable installer, launch it
    if (filePath.toLowerCase().endsWith('.exe')) {
      const child = spawn(filePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();

      setTimeout(() => {
        app.quit();
      }, 500);
      return { success: true, message: 'Starting installer and closing Voltrex Loader...' };
    }

    // If zip or other archive, reveal in Windows Explorer
    shell.showItemInFolder(filePath);
    return { success: true, message: 'Revealed downloaded archive in Explorer.' };
  } else if (platform === 'darwin') {
    // macOS: Open the dmg or folder
    await shell.openPath(filePath);
    return { success: true, message: 'Opened update file.' };
  } else {
    shell.showItemInFolder(filePath);
    return { success: true, message: 'Revealed update file in folder.' };
  }
}

module.exports = {
  checkForGitHubUpdate,
  downloadUpdateAsset,
  cancelUpdateDownload,
  installUpdate,
  compareVersions,
  findAssetForCurrentPlatform
};
