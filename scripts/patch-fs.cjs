const fs = require('node:fs');
try {
  if (fs.realpathSync && fs.realpathSync.native) {
    fs.realpathSync.native = fs.realpathSync;
  }
} catch {}
