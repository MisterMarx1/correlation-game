#!/usr/bin/env node

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
    
    // Check if AdMob dependency already exists
    if (content.includes('play-services-ads')) {
        console.log('AdMob dependency already exists in build.gradle');
        return;
    }

    // Add AdMob dependency - handle both formats
    let dependenciesSection = content.match(/dependencies\s*\{([\s\S]*?)\}/);
    if (dependenciesSection) {
        // Format: dependencies { ... }
        const newDependencies = dependenciesSection[1] + 
            "    implementation 'com.google.android.gms:play-services-ads:22.6.0'\n";
        
        content = content.replace(dependenciesSection[0], 
            `dependencies${newDependencies}}`);
        
        fs.writeFileSync(ANDROID_BUILD_GRADLE, content);
        console.log('Added AdMob dependency to build.gradle');
    } else {
        // Format: dependencies (without brace) - fix the brace first
        const dependenciesMatch = content.match(/dependencies\s*\n([\s\S]*?)\}/);
        if (dependenciesMatch) {
            content = content.replace('dependencies', 'dependencies {');
            
            // Now add the dependency
            const newDependencies = dependenciesMatch[1] + 
                "    implementation 'com.google.android.gms:play-services-ads:22.6.0'\n";
            
            content = content.replace(dependenciesMatch[0], 
                `${newDependencies}}`);
            
            fs.writeFileSync(ANDROID_BUILD_GRADLE, content);
            console.log('Fixed dependencies brace and added AdMob dependency to build.gradle');
        }
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

    // Add AdMob meta-data inside <application> tag
    const applicationTag = content.match(/<application[^>]*>([\s\S]*?)<\/application>/);
    if (applicationTag) {
        // Check if meta-data already exists
        if (content.includes('com.google.android.gms.ads.APPLICATION_ID')) {
            console.log('AdMob meta-data already exists in AndroidManifest.xml');
            return;
        }
        
        const metaData = `
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-2662863757001007~6977812828"/>`;
        
        // Insert meta-data before the closing </application> tag
        const applicationContent = applicationTag[1];
        const newApplicationContent = applicationContent.trim() + metaData + '\n    ';
        
        // Rebuild the full application tag
        const applicationStart = applicationTag[0].match(/<application[^>]*>/)[0];
        const newApplicationTag = applicationStart + newApplicationContent + '</application>';
        
        content = content.replace(applicationTag[0], newApplicationTag);
        
        fs.writeFileSync(ANDROID_MANIFEST, content);
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
    const minSdkMatch = content.match(/minSdkVersion\s*=\s*(\d+)/);
    if (minSdkMatch && parseInt(minSdkMatch[1]) >= 23) {
        console.log('minSdkVersion already compatible with AdMob');
        return;
    }

    // Update minSdkVersion to 23
    content = content.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 23');
    
    fs.writeFileSync(variablesGradle, content);
    console.log('Updated minSdkVersion to 23 for AdMob compatibility');
}

// Run the functions
addAdMobDependency();
addAdMobMetaData();
fixMinSdkVersion();

console.log('AdMob configuration applied successfully!');
