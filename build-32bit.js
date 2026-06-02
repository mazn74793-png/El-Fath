import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadElectron() {
  const url = 'https://github.com/electron/electron/releases/download/v22.3.27/electron-v22.3.27-win32-ia32.zip';
  const outputPath = path.join(__dirname, 'electron-ia32.zip');
  
  if (fs.existsSync(outputPath)) {
    console.log('Zip file electron-ia32.zip already downloaded, skipping download...');
    return;
  }
  
  console.log('Downloading official Electron 32-bit Windows binary from GitHub...');
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download electron binary: ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(outputPath, buffer);
  
  console.log('Download finished successfully!');
}

function unzipElectron() {
  const zipPath = path.join(__dirname, 'electron-ia32.zip');
  const destDir = path.join(__dirname, 'win32-build');
  
  console.log('Extracting Electron 32-bit Windows zip...');
  
  if (fs.existsSync(destDir)) {
    console.log('Cleaning up existing build directory...');
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  
  // Try native Linux unzip command first (super fast, < 2 seconds)
  try {
    console.log('Attempting native unzip execution...');
    execSync(`unzip -q -o "${zipPath}" -d "${destDir}"`);
    console.log('Native extraction completed successfully!');
  } catch (err) {
    console.log('Native unzip not available or failed, falling back to AdmZip...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(destDir, true);
    console.log('AdmZip extraction completed.');
  }
}

function assembleApp() {
  const tempDir = path.join(__dirname, 'win32-build');
  const appDir = path.join(tempDir, 'resources', 'app');
  
  console.log('Assembling files into resources/app folder...');
  fs.mkdirSync(appDir, { recursive: true });
  
  // Copy built React outputs
  fs.cpSync(path.join(__dirname, 'dist'), path.join(appDir, 'dist'), { recursive: true });
  
  // Copy main process files
  fs.copyFileSync(path.join(__dirname, 'main.cjs'), path.join(appDir, 'main.cjs'));
  fs.copyFileSync(path.join(__dirname, 'preload.js'), path.join(appDir, 'preload.js'));
  fs.copyFileSync(path.join(__dirname, 'package.json'), path.join(appDir, 'package.json'));
  
  // Copy whole public folder (logos, etc) to match app config if needed
  if (fs.existsSync(path.join(__dirname, 'public'))) {
    fs.cpSync(path.join(__dirname, 'public'), path.join(appDir, 'public'), { recursive: true });
  }

  // Rename electron.exe to Al-Fath POS.exe
  const oldExe = path.join(tempDir, 'electron.exe');
  const newExe = path.join(tempDir, 'Al-Fath POS.exe');
  if (fs.existsSync(oldExe)) {
    fs.renameSync(oldExe, newExe);
    console.log('Renamed launcher to "Al-Fath POS.exe"');
  } else {
    console.log('Warning: electron.exe not found to rename!');
  }
}

function zipFinalBuild() {
  const buildDir = path.join(__dirname, 'win32-build');
  const publicDir = path.join(__dirname, 'public');
  const outputPath = path.join(publicDir, 'Al-Fath-POS-Win7-32bit.zip');
  
  console.log('Creating final ZIP for download...');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  if (fs.existsSync(outputPath)) {
    console.log('Cleaning up existing final zip...');
    fs.rmSync(outputPath, { force: true });
  }
  
  const zip = new AdmZip();
  zip.addLocalFolder(buildDir);
  zip.writeZip(outputPath);
  
  console.log('Final ZIP successfully created at: ' + outputPath);
}

async function run() {
  try {
    await downloadElectron();
    unzipElectron();
    assembleApp();
    zipFinalBuild();
    console.log('=== BUILD COMPLETED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('Error during 32-bit build:', error);
    process.exit(1);
  }
}

run();
