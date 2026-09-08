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

function findMakensis() {
  const possiblePaths = [
    path.join(process.env.HOME || '', '.cache/electron-builder/nsis-3.0.4.1/nsis-3.0.4.1-1mx3n/linux/makensis'),
    '/usr/bin/makensis',
    '/usr/local/bin/makensis'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback check with find in cache
  try {
    const out = execSync('find ~/.cache/electron-builder -name "makensis" -path "*/linux/*" 2>/dev/null | head -n 1', {
      encoding: 'utf8'
    }).trim();
    if (out && fs.existsSync(out)) {
      return out;
    }
  } catch {}

  throw new Error('makensis binary not found in electron-builder cache or system path.');
}

function findNsisPluginsDir() {
  const possiblePaths = [
    path.join(process.env.HOME || '', '.cache/electron-builder/nsis-resources-3.4.1/nsis-resources-3.4.1-2jx2y/plugins/x86-unicode'),
    '/usr/share/nsis/Plugins/x86-unicode'
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  try {
    const out = execSync('find ~/.cache/electron-builder/nsis-resources* -name "nsis7z.dll" -path "*/x86-unicode/*" 2>/dev/null | head -n 1', {
      encoding: 'utf8'
    }).trim();
    if (out) {
      return path.dirname(out);
    }
  } catch {}

  throw new Error('NSIS x86-unicode plugins directory (containing nsis7z.dll) not found.');
}

async function main() {
  console.log('\n=============================================');
  console.log('      Voltrex Loader - Windows Packager      ');
  console.log('=============================================\n');

  const pkgPath = path.join(rootDir, 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkgData.version || '1.0.1';

  const chosenVersion = await askVersion(currentVersion);
  console.log(`\nBuilding Voltrex Loader Windows version: ${chosenVersion}\n`);

  // Update package.json if version changed
  if (chosenVersion !== currentVersion) {
    pkgData.version = chosenVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8');
    console.log(`✓ Updated package.json version to ${chosenVersion}`);
  }

  // 1. Build Vite frontend bundle
  console.log('\n--- Step 1: Building Frontend Assets ---');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // 2. Package win-unpacked application directory using electron-builder
  console.log('\n--- Step 2: Packaging Windows Application Binaries (win-unpacked) ---');
  execSync('CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --dir', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false'
    }
  });

  const releaseRoot = path.join(rootDir, 'release');
  const winUnpackedDir = path.join(releaseRoot, 'win-unpacked');
  if (!fs.existsSync(winUnpackedDir) || !fs.existsSync(path.join(winUnpackedDir, 'voltrex-loader.exe'))) {
    throw new Error(`win-unpacked directory not found or missing voltrex-loader.exe in ${winUnpackedDir}`);
  }

  // 3. Prepare target release structure: release/windows/<version>/
  console.log('\n--- Step 3: Preparing Release Directory ---');
  const targetDir = path.join(rootDir, 'release', 'windows', chosenVersion);
  fs.mkdirSync(targetDir, { recursive: true });

  // 4. Compress win-unpacked folder into app.bin
  console.log('\n--- Step 4: Compressing Unpacked Application into app.bin ---');
  const appBinPath = path.join(targetDir, 'app.bin');
  if (fs.existsSync(appBinPath)) {
    fs.unlinkSync(appBinPath);
  }

  execSync(`7z a -t7z -mx=7 -m0=lzma2 "${appBinPath}" *`, {
    cwd: winUnpackedDir,
    stdio: 'inherit'
  });
  console.log(`✓ Created compressed application archive: ${path.relative(rootDir, appBinPath)}`);

  // 5. Generate NSIS installer script and compile setup.exe
  console.log('\n--- Step 5: Compiling setup.exe Wizard ---');
  const makensisPath = findMakensis();
  const pluginsDir = findNsisPluginsDir();
  const iconPath = path.join(rootDir, 'build', 'icon.ico');
  const setupExePath = path.join(targetDir, 'setup.exe');
  const nsiScriptPath = path.join(targetDir, 'installer.nsi');

  const nsiContent = `Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"

!addplugindir /x86-unicode "${pluginsDir}"

Name "Voltrex Loader"
OutFile "${setupExePath}"
InstallDir "$LOCALAPPDATA\\Programs\\Voltrex Loader"
InstallDirRegKey HKCU "Software\\VoltrexLoader" "Install_Dir"
RequestExecutionLevel user

!define PRODUCT_NAME "Voltrex Loader"
!define PRODUCT_VERSION "${chosenVersion}"
!define PRODUCT_PUBLISHER "Mohomed Ziard | Voltrex Digital"
!define PRODUCT_UNINST_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\VoltrexLoader"

!define MUI_ICON "${iconPath}"
!define MUI_UNICON "${iconPath}"
!define MUI_ABORTWARNING

; Welcome Page
!insertmacro MUI_PAGE_WELCOME

; Directory Selection Page
!insertmacro MUI_PAGE_DIRECTORY

; Installation Page
!insertmacro MUI_PAGE_INSTFILES

; Finish Page
!define MUI_FINISHPAGE_RUN "$INSTDIR\\voltrex-loader.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Voltrex Loader"
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  
  ; Verify that app.bin is present alongside setup.exe
  StrCpy $0 "$EXEDIR\\app.bin"
  \${IfNot} \${FileExists} "$0"
    StrCpy $0 "$EXEDIR\\data.bin"
  \${EndIf}
  \${IfNot} \${FileExists} "$0"
    MessageBox MB_OK|MB_ICONSTOP "Cannot find installation data file (app.bin) in:$\\r$\\n$EXEDIR$\\r$\\n$\\r$\\nPlease make sure app.bin is in the same directory as setup.exe."
    Abort
  \${EndIf}

  DetailPrint "Extracting Voltrex Loader application files..."
  Nsis7z::ExtractWithDetails "$0" "Installing %s..."
  IfErrors 0 extractOk
    MessageBox MB_OK|MB_ICONSTOP "Failed to decompress application files from $0."
    Abort
  extractOk:

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\Uninstall.exe"

  ; Create Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\\Voltrex Loader"
  CreateShortcut "$SMPROGRAMS\\Voltrex Loader\\Voltrex Loader.lnk" "$INSTDIR\\voltrex-loader.exe" "" "$INSTDIR\\voltrex-loader.exe" 0
  CreateShortcut "$SMPROGRAMS\\Voltrex Loader\\Uninstall Voltrex Loader.lnk" "$INSTDIR\\Uninstall.exe" "" "$INSTDIR\\Uninstall.exe" 0

  ; Create Desktop Shortcut
  CreateShortcut "$DESKTOP\\Voltrex Loader.lnk" "$INSTDIR\\voltrex-loader.exe" "" "$INSTDIR\\voltrex-loader.exe" 0

  ; Write Registry Keys for Windows Add/Remove Programs
  WriteRegStr HKCU "Software\\VoltrexLoader" "Install_Dir" "$INSTDIR"
  WriteRegStr HKCU "\${PRODUCT_UNINST_KEY}" "DisplayName" "\${PRODUCT_NAME}"
  WriteRegStr HKCU "\${PRODUCT_UNINST_KEY}" "DisplayVersion" "\${PRODUCT_VERSION}"
  WriteRegStr HKCU "\${PRODUCT_UNINST_KEY}" "Publisher" "\${PRODUCT_PUBLISHER}"
  WriteRegStr HKCU "\${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\\voltrex-loader.exe"
  WriteRegStr HKCU "\${PRODUCT_UNINST_KEY}" "UninstallString" '"$INSTDIR\\Uninstall.exe"'
  WriteRegStr HKCU "\${PRODUCT_UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\\Uninstall.exe" /S'
  WriteRegStr HKCU "\${PRODUCT_UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "\${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "\${PRODUCT_UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  ; Remove shortcuts
  Delete "$DESKTOP\\Voltrex Loader.lnk"
  Delete "$SMPROGRAMS\\Voltrex Loader\\Voltrex Loader.lnk"
  Delete "$SMPROGRAMS\\Voltrex Loader\\Uninstall Voltrex Loader.lnk"
  RMDir "$SMPROGRAMS\\Voltrex Loader"

  ; Remove installed files
  RMDir /r "$INSTDIR"

  ; Clean Registry Keys
  DeleteRegKey HKCU "\${PRODUCT_UNINST_KEY}"
  DeleteRegKey HKCU "Software\\VoltrexLoader"
SectionEnd
`;

  fs.writeFileSync(nsiScriptPath, nsiContent, 'utf8');

  execSync(`"${makensisPath}" "${nsiScriptPath}"`, {
    cwd: rootDir,
    stdio: 'inherit'
  });

  // Clean up temporary script
  if (fs.existsSync(nsiScriptPath)) {
    fs.unlinkSync(nsiScriptPath);
  }
  console.log(`✓ Compiled setup wizard: ${path.relative(rootDir, setupExePath)}`);

  // 6. Create voltrex-loader-${chosenVersion}-win.zip containing setup.exe and app.bin
  console.log(`\n--- Step 6: Creating voltrex-loader-${chosenVersion}-win.zip Archive ---`);
  const zipName = `voltrex-loader-${chosenVersion}-win.zip`;
  const zipPath = path.join(targetDir, zipName);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  execSync(`zip -j "${zipPath}" "${setupExePath}" "${appBinPath}"`, {
    cwd: targetDir,
    stdio: 'inherit'
  });
  console.log(`✓ Created Windows setup zip package: ${path.relative(rootDir, zipPath)}`);

  // 7. Copy win-unpacked folder into release/windows/<version>/win-unpacked for direct access
  const destWinUnpacked = path.join(targetDir, 'win-unpacked');
  if (fs.existsSync(destWinUnpacked)) {
    fs.rmSync(destWinUnpacked, { recursive: true, force: true });
  }
  fs.cpSync(winUnpackedDir, destWinUnpacked, { recursive: true });
  console.log(`✓ Copied win-unpacked directory into: ${path.relative(rootDir, destWinUnpacked)}`);

  console.log('\n=============================================');
  console.log('        Windows Packaging Complete!          ');
  console.log('=============================================');
  console.log(`\nOutput directory: release/windows/${chosenVersion}/\n`);
  console.log('Artifacts:');
  for (const item of fs.readdirSync(targetDir)) {
    const itemPath = path.join(targetDir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      console.log(`  📁 ${item}/ (unpacked directory)`);
    } else {
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
      console.log(`  • ${item} (${sizeMb} MB)`);
    }
  }
  console.log('\nSummary:');
  console.log(`  1. ${zipName} contains:`);
  console.log('     - setup.exe (installer wizard)');
  console.log('     - app.bin   (compressed win-unpacked payload)');
  console.log('  2. When setup.exe runs, it uncompresses app.bin and installs all files to the user destination.');
  console.log('  3. No install test performed per instructions (ready for manual testing on Windows).\n');
}

main().catch((err) => {
  console.error('\nWindows packaging failed:', err.message);
  process.exit(1);
});
