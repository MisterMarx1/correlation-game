#!/usr/bin/env python3
"""
Sync main index.html with www folder and run Capacitor sync
"""

import os
import shutil
import subprocess
from pathlib import Path

def main():
    # Paths
    root_dir = Path(__file__).parent
    main_index = root_dir / "index.html"
    www_dir = root_dir / "www"
    
    print("=== Math In Space - Index Sync to WWW ===")
    
    # Check if main index exists
    if not main_index.exists():
        print(f"ERROR: Main index not found at {main_index}")
        return 1
    
    # Clear and recreate www folder
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
        print("\n=== SUCCESS ===")
        print("Your Web Audio API changes are now synced to Android!")
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
