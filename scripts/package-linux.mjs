import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function askVersion(currentVersion) {
  if (!process.stdin.isTTY) {
    return currentVersion;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Enter version to build (default: ${currentVersion}): `, (ans) => {
      rl.close();
      const trimmed = ans.trim();
      if (!trimmed) {
        resolve(currentVersion);
      } else {
        resolve(trimmed);
      }
    });
  });
}

async function main() {
  console.log('\n=============================================');
  console.log('       Voltrex Loader - Linux Packager       ');
  console.log('=============================================\n');

  const pkgPath = path.join(rootDir, 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkgData.version || '1.1.1';

  const chosenVersion = await askVersion(currentVersion);
  console.log(`\nBuilding Voltrex Loader version: ${chosenVersion}\n`);

  // Update package.json if version changed
  if (chosenVersion !== currentVersion) {
    pkgData.version = chosenVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8');
    console.log(`✓ Updated package.json version to ${chosenVersion}`);
  }

  // 1. Build Vite frontend bundle
  console.log('\n--- Step 1: Building Frontend Assets ---');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // 2. Run electron-builder for Linux targets (AppImage + unpacked dir)
  console.log('\n--- Step 2: Packaging Electron AppImage & Linux Unpacked ---');
  execSync('npx electron-builder --linux', { cwd: rootDir, stdio: 'inherit' });

  // 3. Prepare target release structure: release/linux/<version>/
  console.log('\n--- Step 3: Assembling Release Directory ---');
  const targetDir = path.join(rootDir, 'release', 'linux', chosenVersion);
  fs.mkdirSync(targetDir, { recursive: true });

  // Find generated AppImage in release/
  const releaseRoot = path.join(rootDir, 'release');
  const releaseFiles = fs.readdirSync(releaseRoot);
  const appImageFile = releaseFiles.find(
    (f) => f.endsWith('.AppImage') && (f.includes(chosenVersion) || f.includes('Voltrex'))
  );

  if (!appImageFile) {
    throw new Error(`Could not find built AppImage in ${releaseRoot}`);
  }

  const sourceAppImagePath = path.join(releaseRoot, appImageFile);
  const targetAppImageName = `Voltrex Loader-${chosenVersion}.AppImage`;
  const targetAppImagePath = path.join(targetDir, targetAppImageName);

  // Copy AppImage to release/linux/<version>/
  fs.copyFileSync(sourceAppImagePath, targetAppImagePath);
  fs.chmodSync(targetAppImagePath, 0o755);
  console.log(`✓ Placed AppImage at: ${path.relative(rootDir, targetAppImagePath)}`);

  // Ensure linux-unpacked exists
  const linuxUnpackedSrc = path.join(releaseRoot, 'linux-unpacked');
  if (!fs.existsSync(linuxUnpackedSrc)) {
    throw new Error(`Could not find linux-unpacked directory at ${linuxUnpackedSrc}`);
  }

  // 4. Create staging folder for tar.gz archive
  const stagingDir = path.join(targetDir, `voltrex-loader-${chosenVersion}-linux`);
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // Copy linux-unpacked into staging as voltrex-loader-unpacked
  console.log('--- Packing linux-unpacked into installer archive ---');
  const unpackedDest = path.join(stagingDir, 'voltrex-loader-unpacked');
  fs.cpSync(linuxUnpackedSrc, unpackedDest, { recursive: true });
  console.log('✓ Copied linux-unpacked application files into installer package');

  // Copy App Icon
  const iconSrc = path.join(rootDir, 'build', 'icon.png');
  const iconDest = path.join(stagingDir, 'voltrex-loader.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDest);
  }

  // Create .desktop file inside staging
  const desktopContent = `[Desktop Entry]
Name=Voltrex Loader
Comment=High-Performance Download Manager
GenericName=Download Manager
Exec=voltrex-loader %U
Icon=voltrex-loader
Terminal=false
Type=Application
Categories=Network;FileTransfer;Utility;
StartupWMClass=voltrex-loader
MimeType=x-scheme-handler/voltrex;
`;
  fs.writeFileSync(path.join(stagingDir, 'voltrex-loader.desktop'), desktopContent, 'utf8');

  // Create install.sh inside staging (installs linux-unpacked, NOT copying AppImage)
  const installShContent = `#!/bin/bash
set -e

echo "========================================="
echo " Installing Voltrex Loader ${chosenVersion}"
echo "========================================="

DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
UNPACKED_DIR="\$DIR/voltrex-loader-unpacked"

if [ ! -d "\$UNPACKED_DIR" ] || [ ! -f "\$UNPACKED_DIR/voltrex-loader" ]; then
  echo "Error: Unpacked application files not found in \$UNPACKED_DIR."
  exit 1
fi

INSTALL_DIR="\$HOME/.local/share/voltrex-loader"
BIN_DIR="\$HOME/.local/bin"
ICONS_DIR="\$HOME/.local/share/icons"
APPS_DIR="\$HOME/.local/share/applications"
DESKTOP_DIR="\$HOME/Desktop"

mkdir -p "\$INSTALL_DIR"
mkdir -p "\$BIN_DIR"
mkdir -p "\$ICONS_DIR"
mkdir -p "\$APPS_DIR"

echo "Installing unpacked application files to \$INSTALL_DIR..."
# Remove older binary files in target before copying
rm -rf "\$INSTALL_DIR"/*

# Copy full linux-unpacked files into destination
cp -r "\$UNPACKED_DIR/"* "\$INSTALL_DIR/"

# Ensure main binary and sandbox permissions
chmod +x "\$INSTALL_DIR/voltrex-loader"
if [ -f "\$INSTALL_DIR/chrome-sandbox" ]; then
  chmod 4755 "\$INSTALL_DIR/chrome-sandbox" 2>/dev/null || chmod +x "\$INSTALL_DIR/chrome-sandbox"
fi

# Symlink CLI command directly to the unpacked executable
ln -sf "\$INSTALL_DIR/voltrex-loader" "\$BIN_DIR/voltrex-loader"

# Copy Icon
if [ -f "\$DIR/voltrex-loader.png" ]; then
  cp "\$DIR/voltrex-loader.png" "\$ICONS_DIR/voltrex-loader.png"
  ICON_PATH="\$ICONS_DIR/voltrex-loader.png"
else
  ICON_PATH="voltrex-loader"
fi

# Install Desktop file
cat > "\$APPS_DIR/voltrex-loader.desktop" <<EOF
[Desktop Entry]
Name=Voltrex Loader
Comment=High-Performance Download Manager
GenericName=Download Manager
Exec="\$INSTALL_DIR/voltrex-loader" %U
Icon=\$ICON_PATH
Terminal=false
Type=Application
Categories=Network;FileTransfer;Utility;
StartupWMClass=voltrex-loader
MimeType=x-scheme-handler/voltrex;
EOF

chmod +x "\$APPS_DIR/voltrex-loader.desktop"

# Desktop Shortcut
if [ -d "\$DESKTOP_DIR" ]; then
  cp "\$APPS_DIR/voltrex-loader.desktop" "\$DESKTOP_DIR/Voltrex Loader.desktop"
  chmod +x "\$DESKTOP_DIR/Voltrex Loader.desktop"
  echo "✓ Desktop shortcut created at \$DESKTOP_DIR/Voltrex Loader.desktop"
fi

# Update desktop database
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "\$APPS_DIR" 2>/dev/null || true
fi

echo "✓ Installed unpacked files to: \$INSTALL_DIR"
echo "✓ Terminal command: \$BIN_DIR/voltrex-loader"
echo "✓ Added to Application Menu"
echo ""
echo "Voltrex Loader ${chosenVersion} successfully installed!"
`;
  const installShPath = path.join(stagingDir, 'install.sh');
  fs.writeFileSync(installShPath, installShContent, 'utf8');
  fs.chmodSync(installShPath, 0o755);

  // Create uninstall.sh inside staging
  const uninstallShContent = `#!/bin/bash
set -e

echo "========================================="
echo " Uninstalling Voltrex Loader"
echo "========================================="

INSTALL_DIR="\$HOME/.local/share/voltrex-loader"
BIN_LINK="\$HOME/.local/bin/voltrex-loader"
DESKTOP_FILE="\$HOME/.local/share/applications/voltrex-loader.desktop"
DESKTOP_SHORTCUT="\$HOME/Desktop/Voltrex Loader.desktop"
ICON_FILE="\$HOME/.local/share/icons/voltrex-loader.png"

if [ -d "\$INSTALL_DIR" ]; then
  rm -rf "\$INSTALL_DIR"
  echo "✓ Removed application directory: \$INSTALL_DIR"
fi

if [ -L "\$BIN_LINK" ] || [ -f "\$BIN_LINK" ]; then
  rm -f "\$BIN_LINK"
  echo "✓ Removed CLI command: \$BIN_LINK"
fi

if [ -f "\$DESKTOP_FILE" ]; then
  rm -f "\$DESKTOP_FILE"
  echo "✓ Removed menu launcher: \$DESKTOP_FILE"
fi

if [ -f "\$DESKTOP_SHORTCUT" ]; then
  rm -f "\$DESKTOP_SHORTCUT"
  echo "✓ Removed desktop shortcut: \$DESKTOP_SHORTCUT"
fi

if [ -f "\$ICON_FILE" ]; then
  rm -f "\$ICON_FILE"
  echo "✓ Removed icon: \$ICON_FILE"
fi

if [ "\$1" = "--purge" ]; then
  rm -rf "\$HOME/.config/voltrex-downloader" "\$HOME/.config/voltrex-loader"
  echo "✓ Purged application settings and cache"
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "\$HOME/.local/share/applications" 2>/dev/null || true
fi

echo ""
echo "Voltrex Loader uninstalled successfully!"
`;
  const uninstallShPath = path.join(stagingDir, 'uninstall.sh');
  fs.writeFileSync(uninstallShPath, uninstallShContent, 'utf8');
  fs.chmodSync(uninstallShPath, 0o755);

  // Create README.txt inside staging
  const readmeContent = `===================================================================
 Voltrex Loader ${chosenVersion} - Linux & SteamOS Installation Guide
===================================================================

INSTALLATION:
  Run the automated install script:
    ./install.sh

  This installs the full linux-unpacked Voltrex Loader distribution to:
    ~/.local/share/voltrex-loader

  And configures:
    - Executable symlink in ~/.local/bin/voltrex-loader
    - Application menu entry (under Network / Internet)
    - Desktop shortcut on ~/Desktop (if available)

UNINSTALLATION:
  Run:
    ./uninstall.sh

  To also remove saved user settings and cache:
    ./uninstall.sh --purge

STANDALONE RUN (AppImage):
  If you prefer to run portable AppImage without installing:
  Use the AppImage located alongside this archive in release/linux/${chosenVersion}/:
    chmod +x "Voltrex Loader-${chosenVersion}.AppImage"
    ./"Voltrex Loader-${chosenVersion}.AppImage"
`;
  fs.writeFileSync(path.join(stagingDir, 'README.txt'), readmeContent, 'utf8');

  // 5. Create tar.gz archive
  console.log('\n--- Step 4: Creating Installation tar.gz Archive ---');
  const tarName = `voltrex-loader-${chosenVersion}-linux.tar.gz`;
  const tarPath = path.join(targetDir, tarName);

  execSync(`tar -czf "${tarPath}" -C "${targetDir}" "voltrex-loader-${chosenVersion}-linux"`, {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Clean staging folder and intermediate root AppImage
  fs.rmSync(stagingDir, { recursive: true, force: true });
  if (fs.existsSync(sourceAppImagePath) && sourceAppImagePath !== targetAppImagePath) {
    try {
      fs.unlinkSync(sourceAppImagePath);
    } catch {}
  }

  console.log('\n=============================================');
  console.log('           Packaging Complete!               ');
  console.log('=============================================');
  console.log(`\nOutput directory: release/linux/${chosenVersion}/\n`);
  console.log(`1. Standalone AppImage:`);
  console.log(`   ${path.relative(rootDir, targetAppImagePath)}`);
  console.log(`2. Installer Archive (contains linux-unpacked files, install.sh, uninstall.sh):`);
  console.log(`   ${path.relative(rootDir, tarPath)}\n`);
}

main().catch((err) => {
  console.error('\nPackaging failed:', err.message);
  process.exit(1);
});
