# Voltrex Download Manager

A modern, high-performance, and secure cross-platform **Download Manager** built with **Electron**, **React**, **Vite**, **Material UI (MUI)**, and **Tailwind CSS**. Designed for Linux (including SteamOS) and Windows.

---

## 🚀 Key Features

### 1. URL Probing & Online Check

- Real-time online/offline host status detection before downloading.
- Automatic extraction of server file name (`Content-Disposition` or URL path), file size (`Content-Length`), MIME content-type, and HTTP status code.
- Automatic verification of server Range resume support (`Accept-Ranges: bytes`).

### 2. Download Setup Box

- Native directory picker with **Browse...** button (`dialog.showOpenDialog`) supporting Linux, SteamOS, and Windows paths.
- Priority assignment: **High**, **Normal**, **Low**.
- Options to **Download Now** or **Add Paused (Queue)**.

### 3. IDM / FDM Inspired Interface

- Dark glassmorphic interface powered by **Material UI** and **Tailwind CSS**.
- Real-time global download speed telemetry meter.
- Sidebar filters by status (**All**, **Downloading**, **Paused**, **Completed**, **Failed / Cancelled**) and by file categories (**Compressed**, **Video**, **Audio**, **Documents**, **Programs**, **Others**).
- Concurrency limit control (1, 2, 3, 5, or 10 simultaneous downloads).

### 4. Telemetry & Progress

- Per-download metrics:
  - Downloaded bytes & Total bytes formatted dynamically.
  - Visual animated progress bar with percentage.
  - Real-time transfer speed (KB/s, MB/s).
  - Dynamic estimated time of arrival (ETA).

### 5. Individual File Controls

- **Pause** active transfers.
- **Resume** paused or interrupted downloads (using HTTP Range requests with `.part` files).
- **Cancel** transfers.
- **Open Downloaded File** (`shell.openPath`).
- **Show in Folder** (`shell.showItemInFolder`).
- **Delete** transfer with option to permanently delete the file from disk.

### 6. Queue & Priority Management

- Automatic queue scheduling based on task priority (`HIGH > NORMAL > LOW`).
- Global batch actions: **Resume All**, **Pause All**, **Stop All**, and **Clear Finished**.
- Persistent download history & state across app restarts.

### 7. Chrome & Chromium Browser Integration

- Dedicated Manifest V3 browser extension located in `extension/`.
- **Automatic Interception**: Intercepts file download clicks and routes them to Voltrex Loader.
- **Context Menus**: Right-click links, videos, and media to _"Download with Voltrex Loader"_.
- **Local Bridge Server**: Runs on `http://127.0.0.1:9580` with zero complex native manifests.
- Fallback safe: If the app is not open, browser downloads proceed normally.

---

## 📁 Project Architecture

```
├── package.json                   # Dependencies, scripts, and build pipeline
├── vite.config.mjs                # Vite build configuration (React + Tailwind)
├── tailwind.config.js             # Tailwind theme configuration
├── postcss.config.js              # PostCSS plugins
├── src
│   ├── main.js                    # Electron main process & IPC coordinator
│   ├── preload.js                 # Safe context bridge (window.electronAPI)
│   ├── main
│   │   └── downloadEngine.js      # Robust streaming download engine with Range support
│   └── renderer
│       ├── index.html             # React mount entry
│       └── src
│           ├── main.jsx           # App bootstrap with MUI ThemeProvider
│           ├── index.css          # Tailwind base & glassmorphic utility styles
│           ├── App.jsx            # State coordinator & layout container
│           ├── components
│           │   ├── TopBar.jsx            # Global toolbar & speed meter
│           │   ├── Sidebar.jsx           # Category, type, and concurrency filters
│           │   ├── DownloadTable.jsx     # Data table with live progress & actions
│           │   └── AddDownloadModal.jsx  # URL probe & download configuration dialog
│           └── utils
│               └── formatters.js         # Bytes, speed, ETA, and category formatters
└── dist                           # Production Vite bundle
```

---

## 🛠️ Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Renderer

```bash
npm run build
```

### 3. Start the Application

```bash
npm start
```

### 4. Development Mode (Vite Dev Server + Electron)

```bash
npm run dev
```

### 5. Run Verification & Syntax Checks

```bash
npm test
```

---

## 🎮 Packaging for SteamOS Desktop & Linux

Voltrex Loader includes an interactive packaging workflow tailored for Steam Deck (SteamOS Desktop mode) and standard Linux distributions.

### 1. Build Package

```bash
npm run package:linux
```

- **Interactive Version Prompt**: The script prompts you to enter the version to build:

  ```
  Enter version to build (default: 1.0.0):
  ```

  - Type a new version number (e.g. `1.0.1` or `1.1.0`) and press <kbd>Enter</kbd> to update and build that version.
  - Or simply press <kbd>Enter</kbd> without typing anything to build the current version from `package.json`.

### 2. Output Structure

Artifacts are automatically organized under `release/linux/<version>/`:

- **`Voltrex Loader-<version>.AppImage`**: Standalone, portable executable ready to run immediately.
- **`voltrex-loader-<version>-linux.tar.gz`**: Installer archive containing:
  - `voltrex-loader-unpacked/`: Complete unpacked Linux distribution (binaries, Electron libraries, locales, and assets).
  - `install.sh`: Automated installer that copies the `linux-unpacked` files to `~/.local/share/voltrex-loader` (does **not** copy the AppImage), sets up terminal command symlink `~/.local/bin/voltrex-loader`, application menu launcher, and Desktop shortcut.
  - `uninstall.sh`: Automated uninstaller (supports `--purge` to clear config/cache).
  - `voltrex-loader.desktop`
  - `voltrex-loader.png`
  - `README.txt`

---

## 🪟 Packaging for Windows

You can build the Windows distribution package directly on Linux/SteamOS without switching operating systems:

### 1. Build Windows Package

```bash
npm run package:win
```

- **Interactive Version Prompt**: Prompts you to specify a version or press <kbd>Enter</kbd> to build the current version from `package.json`.
- **Pure Portable Packaging**: Builds the full Windows binaries (`win-unpacked`) using `electron-builder` and compresses the unpacked folder into a standard zip archive.

### 2. Output Structure

Artifacts are organized inside `release/windows/<version>/`:

- **`voltrex-loader-<version>-win.zip`**: Complete portable Windows distribution zip archive containing the entire `win-unpacked` folder (`voltrex-loader.exe`, dependencies, resources, and libraries). Simply extract and run `voltrex-loader.exe` on Windows.
- **`win-unpacked/`**: Staged raw unpacked Windows application directory for immediate local access or testing.
