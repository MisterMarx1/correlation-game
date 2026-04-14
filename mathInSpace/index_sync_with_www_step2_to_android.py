#!/usr/bin/env python3
"""
Quick Android sync - run Capacitor sync to deploy www to Android
"""

import os
import subprocess
from pathlib import Path

def main():
    root_dir = Path(__file__).parent
    
    print("=== Quick Android Sync ===")
    print("Deploying www folder to Android...")
    
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
