#!/usr/bin/env python3
"""
Quick PIL installer for Math In Space Android build process
"""

import subprocess
import sys

def install_pil():
    """Install PIL/Pillow for image processing"""
    print("Installing PIL/Pillow for launcher icon processing...")
    
    try:
        # Try to install Pillow
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "Pillow"
        ], capture_output=True, text=True, check=True)
        
        print("PIL/Pillow installed successfully!")
        print(result.stdout)
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"Failed to install PIL/Pillow: {e}")
        print(f"Error output: {e.stderr}")
        return False

if __name__ == "__main__":
    if install_pil():
        print("\nPIL/Pillow is now ready for launcher icon processing!")
        print("You can now run your Android build scripts.")
    else:
        print("\nFailed to install PIL/Pillow.")
        print("Please install manually: pip install Pillow")
        sys.exit(1)
