#!/usr/bin/env python3
"""
Quick Android sync - run Capacitor sync to deploy www to Android
"""

import os
import subprocess
import re
import shutil
from pathlib import Path

def get_current_version():
    """Get current version from build.gradle"""
    root_dir = Path(__file__).parent
    build_gradle = root_dir / "android" / "app" / "build.gradle"
    
    if not build_gradle.exists():
        return None, None
    
    with open(build_gradle, 'r') as f:
        content = f.read()
    
    version_code_match = re.search(r'versionCode\s+(\d+)', content)
    version_name_match = re.search(r'versionName\s+"([^"]+)"', content)
    
    if version_code_match and version_name_match:
        return int(version_code_match.group(1)), version_name_match.group(1)
    return None, None

def rename_aab_with_version(root_dir):
    """Rename the generated AAB file to include version number"""
    version_code, version_name = get_current_version()
    if not version_code:
        print("WARNING: Could not get version info for AAB renaming")
        return
    
    # Look for AAB files in release directory
    release_dir = root_dir / "android" / "app" / "build" / "outputs" / "bundle" / "release"
    
    if not release_dir.exists():
        print(f"WARNING: Release directory not found: {release_dir}")
        return
    
    # Find the AAB file
    aab_files = list(release_dir.glob("*.aab"))
    if not aab_files:
        print("WARNING: No AAB file found to rename")
        return
    
    original_aab = aab_files[0]
    new_name = f"app-release_v{version_code}_{version_name.replace('.', '_')}.aab"
    new_path = release_dir / new_name
    
    try:
        shutil.move(original_aab, new_path)
        print(f"AAB renamed: {original_aab.name} -> {new_name}")
    except Exception as e:
        print(f"WARNING: Could not rename AAB file: {e}")

def main():
    root_dir = Path(__file__).parent
    
    print("=== Quick Android Sync ===")
    print("Deploying www folder to Android...")
    
    version_code, version_name = get_current_version()
    if version_code:
        print(f"Current version: {version_code} ({version_name})")
    
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
        
        # Open Android Studio
        print("\nOpening Android Studio...")
        open_commands = [
            ["npx", "cap", "open", "android"],
            [r"C:\Users\spmar\AppData\Local\Programs\Python\Python312\Scripts\npx.cmd", "cap", "open", "android"],
            [r"C:\Program Files\nodejs\npx.cmd", "cap", "open", "android"]
        ]
        
        opened = False
        for cmd in open_commands:
            try:
                subprocess.run(cmd, cwd=root_dir, check=True)
                opened = True
                break
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        if not opened:
            print("Warning: Could not open Android Studio, but sync succeeded")
        
        # Rename AAB file with version number
        print("\nRenaming AAB file with version...")
        rename_aab_with_version(root_dir)
        
        print("\n=== SUCCESS ===")
        print("Android app updated and Android Studio opened!")
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
