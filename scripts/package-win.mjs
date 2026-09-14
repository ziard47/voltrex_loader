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

  // Remove legacy setup.exe / app.bin / nsi files if they exist from prior runs
  for (const legacy of ['setup.exe', 'app.bin', 'installer.nsi']) {
    const legacyPath = path.join(targetDir, legacy);
    if (fs.existsSync(legacyPath)) {
      fs.unlinkSync(legacyPath);
    }
  }

  // 4. Copy win-unpacked folder into release/windows/<version>/win-unpacked
  console.log('\n--- Step 4: Staging win-unpacked Application Files ---');
  const destWinUnpacked = path.join(targetDir, 'win-unpacked');
  if (fs.existsSync(destWinUnpacked)) {
    fs.rmSync(destWinUnpacked, { recursive: true, force: true });
  }
  fs.cpSync(winUnpackedDir, destWinUnpacked, { recursive: true });
  console.log(`✓ Staged win-unpacked directory into: ${path.relative(rootDir, destWinUnpacked)}`);

  // 5. Create voltrex-loader-${chosenVersion}-win.zip containing the win-unpacked directory
  console.log(`\n--- Step 5: Creating voltrex-loader-${chosenVersion}-win.zip Archive ---`);
  const zipName = `voltrex-loader-${chosenVersion}-win.zip`;
  const zipPath = path.join(targetDir, zipName);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  execSync(`zip -r -q "${zipName}" win-unpacked`, {
    cwd: targetDir,
    stdio: 'inherit'
  });
  console.log(`✓ Created portable Windows zip package: ${path.relative(rootDir, zipPath)}`);

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
