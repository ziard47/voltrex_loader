import fs from 'node:fs';
import os from 'node:os';
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
  console.log('      Voltrex Loader - Windows Packager      ');
  console.log('=============================================\n');

  const pkgPath = path.join(rootDir, 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkgData.version || '1.1.1';

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

  // 2. Package win-unpacked application directory using electron-builder in an isolated temp directory
  console.log('\n--- Step 2: Packaging Windows Application Binaries (win-unpacked) ---');
  const tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voltrex-win-build-'));
  const targetDir = path.join(rootDir, 'release', 'windows', chosenVersion);
  const zipName = `voltrex-loader-${chosenVersion}-win.zip`;

  try {
    execSync(`CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --win --dir -c.directories.output="${tempOutputDir}"`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        CSC_IDENTITY_AUTO_DISCOVERY: 'false'
      }
    });

    const winUnpackedDir = path.join(tempOutputDir, 'win-unpacked');
    if (!fs.existsSync(winUnpackedDir) || !fs.existsSync(path.join(winUnpackedDir, 'voltrex-loader.exe'))) {
      throw new Error(`win-unpacked directory not found or missing voltrex-loader.exe in ${winUnpackedDir}`);
    }

    // 3. Prepare target release structure: release/windows/<version>/
    console.log('\n--- Step 3: Preparing Release Directory ---');
    fs.mkdirSync(targetDir, { recursive: true });

    // Remove legacy setup.exe / app.bin / nsi files if they exist from prior runs
    for (const legacy of ['setup.exe', 'app.bin', 'installer.nsi']) {
      const legacyPath = path.join(targetDir, legacy);
      if (fs.existsSync(legacyPath)) {
        fs.unlinkSync(legacyPath);
      }
    }

    // 4. Create voltrex-loader-${chosenVersion}-win.zip archive directly from tempOutputDir
    console.log(`\n--- Step 4: Creating ${zipName} Archive ---`);
    const zipPath = path.join(targetDir, zipName);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    execSync(`zip -r -q "${zipPath}" win-unpacked`, {
      cwd: tempOutputDir,
      stdio: 'inherit'
    });
    console.log(`✓ Created portable Windows zip package: ${path.relative(rootDir, zipPath)}`);

    // 5. Copy win-unpacked folder into release/windows/<version>/win-unpacked
    console.log('\n--- Step 5: Staging win-unpacked Application Files ---');
    const destWinUnpacked = path.join(targetDir, 'win-unpacked');
    if (fs.existsSync(destWinUnpacked)) {
      try {
        fs.rmSync(destWinUnpacked, { recursive: true, force: true });
      } catch {
        try {
          const staleDir = path.join(rootDir, 'release', '.stale_fuse_dirs');
          fs.mkdirSync(staleDir, { recursive: true });
          fs.renameSync(destWinUnpacked, path.join(staleDir, `win_unpacked_${Date.now()}`));
        } catch {}
      }
    }
    fs.cpSync(winUnpackedDir, destWinUnpacked, { recursive: true });
    console.log(`✓ Staged win-unpacked directory into: ${path.relative(rootDir, destWinUnpacked)}`);

    const helperBin = path.join(destWinUnpacked, 'resources', 'bin', 'yt-dlp.exe');
    if (fs.existsSync(helperBin)) {
      console.log('✓ Verified bundled helper binary: resources/bin/yt-dlp.exe');
    }
  } finally {
    try {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  console.log('\n=============================================');
  console.log('        Windows Packaging Complete!          ');
  console.log('=============================================\n');
  console.log(`Output directory: release/windows/${chosenVersion}/\n`);
  console.log('Artifacts:');
  for (const item of fs.readdirSync(targetDir)) {
    const itemPath = path.join(targetDir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      console.log(`  📁 ${item}/ (unpacked portable directory)`);
    } else {
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
      console.log(`  • ${item} (${sizeMb} MB)`);
    }
  }
  console.log('\nSummary:');
  console.log(`  1. ${zipName} contains the entire win-unpacked folder with voltrex-loader.exe and all dependencies.`);
  console.log('  2. Ready for portable distribution or extraction on Windows without an installer wizard.\n');
}

main().catch((err) => {
  console.error('\nWindows packaging failed:', err.message);
  process.exit(1);
});
