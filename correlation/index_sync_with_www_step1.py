#!/usr/bin/env python3
"""
Sync main index.html with www folder and run Capacitor sync for Correlation game
Ensures Capacitor versions are consistent before syncing
"""

import os
import shutil
import subprocess
import re
import json
from pathlib import Path

def upgrade_android_gradle_plugin():
    """Upgrade Android Gradle plugin to 8.9.0 to support compileSdk 35"""
    root_dir = Path(__file__).parent
    build_gradle = root_dir / "android" / "build.gradle"
    
    # Default build.gradle content with 8.9.0
    default_content = """// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
    
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.9.0'
        classpath 'com.google.gms:google-services:4.4.0'

        // NOTE: Do not place your application dependencies here; they belong
        // in the individual module build.gradle files
    }
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
"""
    
    if not build_gradle.exists():
        # Create with 8.9.0
        with open(build_gradle, 'w') as f:
            f.write(default_content)
        print("Created android/build.gradle with Gradle plugin 8.9.0")
        return
    
    with open(build_gradle, 'r') as f:
        content = f.read()
    
    # Check if already upgraded
    if "gradle:8.9.0" in content:
        print("Android Gradle plugin already upgraded to 8.9.0")
        return
    
    # Upgrade to 8.9.0
    content = content.replace(
        "classpath 'com.android.tools.build:gradle:8.2.1'",
        "classpath 'com.android.tools.build:gradle:8.9.0'"
    )
    content = content.replace(
        "classpath 'com.android.tools.build:gradle:8.10.2'",
        "classpath 'com.android.tools.build:gradle:8.9.0'"
    )
    
    with open(build_gradle, 'w') as f:
        f.write(content)
    
    print("Upgraded Android Gradle plugin to 8.9.0 for compileSdk 35 support")

def upgrade_sdk_versions():
    """Upgrade SDK versions to support latest Capacitor"""
    root_dir = Path(__file__).parent
    variables_gradle = root_dir / "android" / "variables.gradle"
    
    # Default variables.gradle content with SDK 35
    default_content = """ext {
    minSdkVersion = 23
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxActivityVersion = '1.8.0'
    androidxAppCompatVersion = '1.6.1'
    androidxCoordinatorLayoutVersion = '1.2.0'
    androidxCoreVersion = '1.12.0'
    androidxFragmentVersion = '1.6.2'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.9.0'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.1.5'
    androidxEspressoCoreVersion = '3.5.1'
    cordovaAndroidVersion = '10.1.1'
}
"""
    
    if not variables_gradle.exists():
        # Create with SDK 35
        with open(variables_gradle, 'w') as f:
            f.write(default_content)
        print("Created android/variables.gradle with SDK 35")
        return
    
    with open(variables_gradle, 'r') as f:
        content = f.read()
    
    # Check if already upgraded to 35
    if "compileSdkVersion = 35" in content:
        print("SDK versions already upgraded to 35")
        return
    
    # Upgrade to SDK 35 (supports VANILLA_ICE_CREAM)
    content = content.replace(
        "compileSdkVersion = 34",
        "compileSdkVersion = 35"
    )
    content = content.replace(
        "targetSdkVersion = 34",
        "targetSdkVersion = 35"
    )
    
    with open(variables_gradle, 'w') as f:
        f.write(content)
    
    print("Upgraded SDK versions to 35 for Capacitor compatibility")

def upgrade_gradle_for_java21():
    """Upgrade Gradle to 8.11.1 to support Java 21 and compileSdk 35"""
    root_dir = Path(__file__).parent
    gradle_wrapper = root_dir / "android" / "gradle" / "wrapper" / "gradle-wrapper.properties"
    
    # Create gradle wrapper directory if it doesn't exist
    gradle_wrapper.parent.mkdir(parents=True, exist_ok=True)
    
    # Default gradle-wrapper.properties content with 8.11.1
    default_content = """distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-all.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
"""
    
    if not gradle_wrapper.exists():
        # Create with 8.11.1
        with open(gradle_wrapper, 'w') as f:
            f.write(default_content)
        print("Created gradle-wrapper.properties with Gradle 8.11.1")
        return
    
    with open(gradle_wrapper, 'r') as f:
        content = f.read()
    
    # Check if already upgraded to 8.11.1
    if "gradle-8.11.1" in content:
        print("Gradle already upgraded to 8.11.1")
        return
    
    # Upgrade to 8.11.1 (supports Java 21 and compileSdk 35)
    content = content.replace(
        "gradle-8.2.1-all.zip",
        "gradle-8.11.1-all.zip"
    )
    content = content.replace(
        "gradle-8.10.2-all.zip",
        "gradle-8.11.1-all.zip"
    )
    
    with open(gradle_wrapper, 'w') as f:
        f.write(content)
    
    print("Upgraded Gradle to 8.11.1 for Java 21 and compileSdk 35 support")

def create_build_scripts():
    """Create build and AdMob configuration scripts if they don't exist"""
    root_dir = Path(__file__).parent
    scripts_dir = root_dir / "scripts"
    
    # Create scripts directory
    scripts_dir.mkdir(exist_ok=True)
    
    # Create build-www.js
    build_www_path = scripts_dir / "build-www.js"
    if not build_www_path.exists():
        build_www_content = '''const fs = require('fs');
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

console.log(`Building Correlation to www folder...`);
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
  projectName: 'Correlation',
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
  name: 'Correlation',
  short_name: 'Correlation',
  description: 'Strategic puzzle game with node transitions and energy matching',
  start_url: '.',
  display: 'standalone',
  background_color: '#0a1628',
  theme_color: '#4ecdc4',
  icons: [
    {
      src: 'favicon/favicon.ico',
      sizes: '192x192',
      type: 'image/x-icon'
    }
  ]
};

fs.writeFileSync(
  path.join(wwwPath, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);
console.log('Created manifest.json');

console.log(`\\nBuild complete!`);
console.log(`www folder created at: ${wwwPath}`);
console.log(`Build info: ${gitBranch}@${gitCommit} (${buildTimestamp})`);
console.log(`\\nNext steps:`);
console.log(`1. Run: npm run cap:sync`);
console.log(`2. Run: npm run cap:open`);
console.log(`3. Build APK/AAB in Android Studio`);
'''
        with open(build_www_path, 'w') as f:
            f.write(build_www_content)
        print(f"Created {build_www_path}")
    else:
        print(f"build-www.js already exists")
    
    # Create apply-admob-config.js
    admob_config_path = scripts_dir / "apply-admob-config.js"
    if not admob_config_path.exists():
        admob_config_content = """#!/usr/bin/env node

/**
 * Post-sync script to apply AdMob configuration after Capacitor sync
 * This preserves AdMob settings that would otherwise be overwritten
 */

const fs = require('fs');
const path = require('path');

const ANDROID_BUILD_GRADLE = path.join(__dirname, '../android/app/build.gradle');
const ANDROID_MANIFEST = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');

console.log('Applying AdMob configuration after Capacitor sync...');

// 1. Add AdMob dependency to build.gradle
function addAdMobDependency() {
    if (!fs.existsSync(ANDROID_BUILD_GRADLE)) {
        console.log('build.gradle not found, skipping...');
        return;
    }

    let content = fs.readFileSync(ANDROID_BUILD_GRADLE, 'utf8');
    
    // Fix: Add opening brace to dependencies if missing
    if (!content.includes('dependencies {')) {
        // Missing opening brace - add it
        content = content.replace(/dependencies\\s*\\n/, 'dependencies {\\n');
        fs.writeFileSync(ANDROID_BUILD_GRADLE, content);
        console.log('Fixed missing opening brace in dependencies block');
    }
    
    // Check if AdMob dependency already exists
    if (content.includes('play-services-ads')) {
        console.log('AdMob dependency already exists in build.gradle');
        return;
    }
    
    // Now find dependencies block and add AdMob dependency before closing brace
    let depsMatch = content.match(/dependencies\\s*\\{([^}]*)\\}/);
    if (depsMatch) {
        const depsContent = depsMatch[1];
        const newDeps = depsContent.trimEnd() + "\\n    implementation 'com.google.android.gms:play-services-ads:22.6.0'";
        content = content.replace(depsMatch[0], `dependencies {${newDeps}\\n}`);
        fs.writeFileSync(ANDROID_BUILD_GRADLE, content);
        console.log('Added AdMob dependency to build.gradle');
    }
}

// 2. Add AdMob meta-data to AndroidManifest.xml
function addAdMobMetaData() {
    if (!fs.existsSync(ANDROID_MANIFEST)) {
        console.log('AndroidManifest.xml not found, skipping...');
        return;
    }

    let content = fs.readFileSync(ANDROID_MANIFEST, 'utf8');
    
    // Check if AdMob meta-data already exists
    if (content.includes('com.google.android.gms.ads.APPLICATION_ID')) {
        console.log('AdMob meta-data already exists in AndroidManifest.xml');
        return;
    }

    // Find </application> and insert before it
    const appCloseIndex = content.lastIndexOf('</application>');
    if (appCloseIndex !== -1) {
        const metaData = "        <meta-data\\n            android:name=\\"com.google.android.gms.ads.APPLICATION_ID\\"\\n            android:value=\\"ca-app-pub-2662863757001007~6977812828\\"/>\\n    ";
        const newContent = content.substring(0, appCloseIndex) + metaData + content.substring(appCloseIndex);
        fs.writeFileSync(ANDROID_MANIFEST, newContent);
        console.log('Added AdMob meta-data to AndroidManifest.xml');
    }
}

// 3. Fix minSdkVersion for AdMob compatibility
function fixMinSdkVersion() {
    const variablesGradle = path.join(__dirname, '../android/variables.gradle');
    if (!fs.existsSync(variablesGradle)) {
        console.log('variables.gradle not found, skipping minSdkVersion fix...');
        return;
    }

    let content = fs.readFileSync(variablesGradle, 'utf8');
    
    // Check if minSdkVersion is already 23 or higher
    const minSdkMatch = content.match(/minSdkVersion\\s*=\\s*(\\d+)/);
    if (minSdkMatch && parseInt(minSdkMatch[1]) >= 23) {
        console.log('minSdkVersion already compatible with AdMob');
        return;
    }

    // Update minSdkVersion to 23
    content = content.replace(/minSdkVersion\\s*=\\s*\\d+/, 'minSdkVersion = 23');
    fs.writeFileSync(variablesGradle, content);
    console.log('Updated minSdkVersion to 23 for AdMob compatibility');
}

// Run the functions
addAdMobDependency();
addAdMobMetaData();
fixMinSdkVersion();

console.log('AdMob configuration applied successfully!');
"""
        with open(admob_config_path, 'w') as f:
            f.write(admob_config_content)
        print(f"Created {admob_config_path}")
    else:
        print(f"apply-admob-config.js already exists")

def fix_capacitor_versions():
    """Ensure all Capacitor dependencies use consistent version"""
    root_dir = Path(__file__).parent
    package_json = root_dir / "package.json"
    
    if not package_json.exists():
        print(f"WARNING: package.json not found at {package_json}")
        return False
    
    # Read package.json
    with open(package_json, 'r') as f:
        package_data = json.load(f)
    
    # Target version for all Capacitor packages
    target_version = "^6.0.0"
    
    # Check and fix Capacitor dependencies
    dependencies = package_data.get("dependencies", {})
    capacitor_packages = [
        "@capacitor/core",
        "@capacitor/android",
        "@capacitor/cli",
        "@capacitor-community/admob"
    ]
    
    needs_update = False
    for pkg in capacitor_packages:
        if pkg in dependencies:
            current_version = dependencies[pkg]
            if current_version != target_version:
                print(f"Updating {pkg}: {current_version} -> {target_version}")
                dependencies[pkg] = target_version
                needs_update = True
        else:
            # Add missing packages
            if pkg == "@capacitor-community/admob":
                print(f"Adding missing {pkg}: {target_version}")
                dependencies[pkg] = target_version
                needs_update = True
    
    if needs_update:
        package_data["dependencies"] = dependencies
        with open(package_json, 'w') as f:
            json.dump(package_data, f, indent=2)
        print("package.json updated with consistent Capacitor versions")
        return True
    else:
        print("Capacitor versions already consistent")
        return False

def initialize_android_project():
    """Initialize Android project if it doesn't exist"""
    root_dir = Path(__file__).parent
    android_dir = root_dir / "android"
    
    if android_dir.exists():
        print("Android project already exists")
        return True
    
    print("Android project not found, initializing...")
    try:
        npx_commands = [
            ["npx", "cap", "add", "android"],
            [r"C:\Users\spmar\AppData\Local\Programs\Python\Python312\Scripts\npx.cmd", "cap", "add", "android"],
            [r"C:\Program Files\nodejs\npx.cmd", "cap", "add", "android"]
        ]
        
        result = None
        for cmd in npx_commands:
            try:
                result = subprocess.run(
                    cmd, 
                    cwd=root_dir,
                    capture_output=True,
                    text=True,
                    check=True
                )
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if result is None:
            raise FileNotFoundError("npx command not found")
        
        print("Android project initialized successfully")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Failed to initialize Android project")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False
    except FileNotFoundError:
        print("ERROR: npx command not found. Make sure Node.js is installed and in PATH")
        return False

def increment_version():
    """Increment version code and name in build.gradle"""
    root_dir = Path(__file__).parent
    build_gradle = root_dir / "android" / "app" / "build.gradle"
    
    if not build_gradle.exists():
        print(f"WARNING: build.gradle not found at {build_gradle}")
        return None, None
    
    # Read current build.gradle
    with open(build_gradle, 'r') as f:
        content = f.read()
    
    # Find current version code and name
    version_code_match = re.search(r'versionCode\s+(\d+)', content)
    version_name_match = re.search(r'versionName\s+"([^"]+)"', content)
    
    if not version_code_match or not version_name_match:
        print("WARNING: Could not find version info in build.gradle")
        return None, None
    
    current_code = int(version_code_match.group(1))
    current_name = version_name_match.group(1)
    
    # Increment version code
    new_code = current_code + 1
    
    # Update version name (increment patch version)
    if '.' in current_name:
        parts = current_name.split('.')
        patch = int(parts[-1]) + 1
        new_name = '.'.join(parts[:-1]) + f'.{patch}'
    else:
        new_name = f"{current_name}.1"
    
    # Update build.gradle content
    content = re.sub(r'versionCode\s+\d+', f'versionCode {new_code}', content)
    content = re.sub(r'versionName\s+"[^"]+"', f'versionName "{new_name}"', content)
    
    # Write back to build.gradle
    with open(build_gradle, 'w') as f:
        f.write(content)
    
    print(f"Version updated: {current_code} ({current_name}) -> {new_code} ({new_name})")
    return new_code, new_name

def main():
    # Paths
    root_dir = Path(__file__).parent
    main_index = root_dir / "index.html"
    www_dir = root_dir / "www"
    
    print("=== Correlation - Index Sync to WWW ===")
    
    # Upgrade Android Gradle plugin for compileSdk 35 support
    print("\n=== Upgrading Android Gradle Plugin ===")
    upgrade_android_gradle_plugin()
    
    # Upgrade SDK versions for Capacitor compatibility
    print("\n=== Upgrading SDK Versions ===")
    upgrade_sdk_versions()
    
    # Upgrade Gradle for Java 21 support
    print("\n=== Upgrading Gradle for Java 21 ===")
    upgrade_gradle_for_java21()
    
    # Create build scripts first
    print("\n=== Creating build scripts ===")
    create_build_scripts()
    
    # Fix Capacitor versions first
    print("\n=== Checking Capacitor versions ===")
    fix_capacitor_versions()
    
    # Initialize Android project if needed
    print("\n=== Initializing Android project ===")
    if not initialize_android_project():
        print("ERROR: Failed to initialize Android project")
        return 1
    
    # Auto-increment version
    print("\n=== Incrementing version ===")
    new_code, new_name = increment_version()
    if new_code:
        print(f"Building version {new_code} ({new_name})")
    
    # Check if main index exists
    if not main_index.exists():
        print(f"ERROR: Main index not found at {main_index}")
        return 1
    
    # Clear and recreate www folder
    print(f"\n=== Syncing assets to www ===")
    print(f"Clearing www folder: {www_dir}")
    if www_dir.exists():
        shutil.rmtree(www_dir)
    www_dir.mkdir(exist_ok=True)
    
    # Copy main index to www
    www_index = www_dir / "index.html"
    print(f"Copying {main_index} -> {www_index}")
    shutil.copy2(main_index, www_index)
    
    # Copy companion page
    companion_page = root_dir / "companion-page.html"
    if companion_page.exists():
        www_companion = www_dir / "companion-page.html"
        print(f"Copying {companion_page} -> {www_companion}")
        shutil.copy2(companion_page, www_companion)
    
    # Copy other required folders if they exist
    folders_to_copy = ["sfx", "favicon", "images"]
    for folder in folders_to_copy:
        src_folder = root_dir / folder
        if src_folder.exists():
            dst_folder = www_dir / folder
            print(f"Copying {src_folder} -> {dst_folder}")
            shutil.copytree(src_folder, dst_folder)
    
    # Run Capacitor sync
    print("\n=== Running Capacitor Sync ===")
    try:
        # Try npx first, then fallback to full path
        npx_commands = [
            ["npx", "cap", "sync", "android"],
            [r"C:\Users\spmar\AppData\Local\Programs\Python\Python312\Scripts\npx.cmd", "cap", "sync", "android"],
            [r"C:\Program Files\nodejs\npx.cmd", "cap", "sync", "android"]
        ]
        
        result = None
        for cmd in npx_commands:
            try:
                result = subprocess.run(
                    cmd, 
                    cwd=root_dir,
                    capture_output=True,
                    text=True,
                    check=True
                )
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if result is None:
            raise FileNotFoundError("npx command not found")
        print("Sync output:")
        print(result.stdout)
        if result.stderr:
            print("Sync warnings/errors:")
            print(result.stderr)
        
        # Apply AdMob configuration after sync
        print("\n=== Applying AdMob Configuration ===")
        try:
            admob_result = subprocess.run(
                ["node", "scripts/apply-admob-config.js"],
                cwd=root_dir,
                capture_output=True,
                text=True,
                check=True
            )
            print("AdMob config output:")
            print(admob_result.stdout)
            if admob_result.stderr:
                print("AdMob config warnings:")
                print(admob_result.stderr)
        except subprocess.CalledProcessError as e:
            print(f"AdMob config failed: {e}")
            print("Continuing anyway...")
        
        print("\n=== SUCCESS ===")
        print("Correlation game is now synced to Android!")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Capacitor sync failed with exit code {e.returncode}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return 1
    except FileNotFoundError:
        print("ERROR: npx command not found. Make sure Node.js is installed and in PATH")
        return 1

if __name__ == "__main__":
    exit(main())
