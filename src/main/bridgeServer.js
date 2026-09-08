const http = require('node:http');

class BridgeServer {
  constructor(downloadEngine, getMainWindow, port = 9580, getSettings = null) {
    this.downloadEngine = downloadEngine;
    this.getMainWindow = getMainWindow;
    this.port = port;
    this.getSettings = getSettings;
    this.server = null;
  }

  start() {
    this.server = http.createServer(async (req, res) => {
      // Setup CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://127.0.0.1:${this.port}`);

      // GET /ping (Health check handshake for extension)
      if (req.method === 'GET' && (url.pathname === '/ping' || url.pathname === '/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          app: 'voltrex-loader',
          version: '1.0.0'
        }));
        return;
      }

      // GET /info
      if (req.method === 'GET' && url.pathname === '/info') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          app: 'voltrex-loader',
          defaultDownloadPath: this.downloadEngine.defaultDownloadPath
        }));
        return;
      }

      // POST /download
      if (req.method === 'POST' && url.pathname === '/download') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const downloadUrl = data.url;

            if (!downloadUrl) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Missing download URL' }));
              return;
            }

            const settings = typeof this.getSettings === 'function' ? this.getSettings() : { autoCapturePrompt: true };
            const win = this.getMainWindow();

            if (settings && settings.autoCapturePrompt === false) {
              // Direct auto-start without modal prompt
              const task = await this.downloadEngine.addDownload({
                url: downloadUrl,
                fileName: data.fileName,
                referrer: data.referrer
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, autoAdded: true, taskId: task.id, fileName: task.fileName }));
            } else {
              // Bring Electron window to front & prompt Add Download modal
              if (win && !win.isDestroyed()) {
                if (win.isMinimized()) win.restore();
                win.show();
                win.focus();
                win.webContents.send('download:captured-prompt', {
                  url: downloadUrl,
                  fileName: data.fileName,
                  referrer: data.referrer
                });
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, prompted: true, fileName: data.fileName }));
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      // 404 Not Found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    });

    this.server.on('error', (err) => {
      console.error('[BridgeServer] Error:', err.message);
    });

    this.server.listen(this.port, '127.0.0.1', () => {
      console.log(`[BridgeServer] Browser extension bridge listening on http://127.0.0.1:${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = { BridgeServer };
