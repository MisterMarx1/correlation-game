const fs = require('fs');
const path = require('path');

// Try to get git info, but handle cases where git isn't available
let gitBranch = 'unknown';
let gitCommit = 'unknown';
try {
  const { execSync } = require('child_process');
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.log('Git not available, using default values');
}

const buildTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const wwwPath = path.join(__dirname, '..', 'www');

console.log(`Building Math In Space to www folder...`);
console.log(`Branch: ${gitBranch}, Commit: ${gitCommit}`);

// Clean and create www directory
if (fs.existsSync(wwwPath)) {
  fs.rmSync(wwwPath, { recursive: true, force: true });
}
fs.mkdirSync(wwwPath, { recursive: true });

// Copy main index.html file
const indexSource = path.join(__dirname, '..', 'index.html');
const indexDest = path.join(wwwPath, 'index.html');
if (fs.existsSync(indexSource)) {
  fs.copyFileSync(indexSource, indexDest);
  console.log('Copied index.html');
} else {
  console.error('index.html not found!');
  process.exit(1);
}

// Copy sfx folder if it exists
const sfxSource = path.join(__dirname, '..', 'sfx');
const sfxDest = path.join(wwwPath, 'sfx');
if (fs.existsSync(sfxSource)) {
  fs.mkdirSync(sfxDest, { recursive: true });
  const sfxFiles = fs.readdirSync(sfxSource);
  sfxFiles.forEach(file => {
    const srcFile = path.join(sfxSource, file);
    const destFile = path.join(sfxDest, file);
    fs.copyFileSync(srcFile, destFile);
  });
  console.log(`Copied ${sfxFiles.length} sound files`);
}

// Copy favicon folder if it exists
const faviconSource = path.join(__dirname, '..', 'favicon');
const faviconDest = path.join(wwwPath, 'favicon');
if (fs.existsSync(faviconSource)) {
  fs.mkdirSync(faviconDest, { recursive: true });
  const faviconFiles = fs.readdirSync(faviconSource);
  faviconFiles.forEach(file => {
    const srcFile = path.join(faviconSource, file);
    const destFile = path.join(faviconDest, file);
    fs.copyFileSync(srcFile, destFile);
  });
  console.log(`Copied ${faviconFiles.length} favicon files`);
}

// Copy favicon.ico if it exists in root
const faviconIcoSource = path.join(__dirname, '..', 'favicon.ico');
const faviconIcoDest = path.join(wwwPath, 'favicon.ico');
if (fs.existsSync(faviconIcoSource)) {
  fs.copyFileSync(faviconIcoSource, faviconIcoDest);
  console.log('Copied favicon.ico');
}

// Create build info file
const buildInfo = {
  projectName: 'Math In Space',
  branch: gitBranch,
  commit: gitCommit,
  buildTime: buildTimestamp,
  buildDate: new Date().toISOString(),
  version: require('../package.json').version || '1.0.0',
  buildType: 'Capacitor Android Build'
};

fs.writeFileSync(
  path.join(wwwPath, 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);
console.log('Created build-info.json');

// Create a simple manifest.json for PWA features
const manifest = {
  name: 'Math In Space',
  short_name: 'MathSpace',
  description: 'Arithmetic practice game set in space',
  start_url: '.',
  display: 'standalone',
  background_color: '#000428',
  theme_color: '#00ccff',
  icons: [
    {
      src: 'favicon/math_space_favicon.png',
      sizes: '192x192',
      type: 'image/png'
    }
  ]
};

fs.writeFileSync(
  path.join(wwwPath, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('Created manifest.json');

console.log(`\nBuild complete!`);
console.log(`www folder created at: ${wwwPath}`);
console.log(`Build info: ${gitBranch}@${gitCommit} (${buildTimestamp})`);
console.log(`\nNext steps:`);
console.log(`1. Run: npm run cap:sync`);
console.log(`2. Run: npm run cap:open`);
console.log(`3. Build APK/AAB in Android Studio`);
