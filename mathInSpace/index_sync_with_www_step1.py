#!/usr/bin/env python3
"""
Sync main index.html with www folder and run Capacitor sync
"""

import os
import shutil
import subprocess
import re
from pathlib import Path

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("WARNING: PIL not available. Install with: pip install Pillow")
    print("Launcher icons will not be processed.")

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

def create_resized_pngs():
    """Create resized PNG versions (48, 72, 96, 144, 192) from 512x512 source"""
    if not PIL_AVAILABLE:
        print("Skipping PNG resizing (PIL not available)")
        return
    
    root_dir = Path(__file__).parent
    
    # Find source icon (try multiple locations)
    source_paths = [
        root_dir / "images" / "mathinspace_512_512.png",
        root_dir / "favicon" / "math_space_favicon.png",
        root_dir / "mathinspace_512_512.png"
    ]
    
    source_icon = None
    for path in source_paths:
        if path.exists():
            source_icon = path
            break
    
    if not source_icon:
        print("WARNING: No source icon found for PNG resizing. Expected locations:")
        for path in source_paths:
            print(f"  - {path}")
        return
    
    print(f"Creating resized PNGs from: {source_icon}")
    source_dir = source_icon.parent
    
    # Sizes to create
    sizes = [48, 72, 96, 144, 192]
    
    try:
        with Image.open(source_icon) as img:
            # Convert to RGB (opaque, no alpha channel) to prevent Android adaptive icon shrinking
            if img.mode != 'RGB':
                # If image has transparency, composite it on white background
                if img.mode == 'RGBA':
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3])  # Use alpha as mask
                    img = background
                else:
                    img = img.convert('RGB')
            
            for size in sizes:
                # Scale image to fill entire canvas (100%, not safe zone)
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                output_path = source_dir / f"mathinspace_{size}_{size}.png"
                resized.save(output_path, "PNG")
                print(f"Created: {output_path.name}")
    except Exception as e:
        print(f"ERROR: Failed to create resized PNGs: {e}")

def create_foreground_pngs():
    """Create foreground PNGs at 108dp density-specific sizes from source"""
    if not PIL_AVAILABLE:
        print("Skipping foreground PNG creation (PIL not available)")
        return
    
    root_dir = Path(__file__).parent
    
    # Find source icon
    source_paths = [
        root_dir / "images" / "mathinspace_512_512.png",
        root_dir / "favicon" / "math_space_favicon.png",
        root_dir / "mathinspace_512_512.png"
    ]
    
    source_icon = None
    for path in source_paths:
        if path.exists():
            source_icon = path
            break
    
    if not source_icon:
        print("WARNING: No source icon found for foreground PNG creation")
        return
    
    # 108dp foreground sizes for each density
    foreground_sizes = {
        108: "mipmap-mdpi",      # 108×108
        162: "mipmap-hdpi",      # 162×162
        216: "mipmap-xhdpi",     # 216×216
        324: "mipmap-xxhdpi",    # 324×324
        432: "mipmap-xxxhdpi"    # 432×432
    }
    
    android_res_dir = root_dir / "android" / "app" / "src" / "main" / "res"
    scale_factor = 0.70  # Scale PNG to 70% of canvas size
    offset_x = 5  # Move right by 5 pixels
    offset_y = 20  # Move down by 20 pixels
    
    try:
        with Image.open(source_icon) as img:
            # Convert to RGBA for foreground (needs transparency support)
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            print("Creating foreground PNGs (108dp sizes, scaled to 70%, offset right 5px down 20px)...")
            for size, mipmap_name in foreground_sizes.items():
                # Scale to full size first
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Scale down to 70% and center on transparent canvas
                scaled_size = int(size * scale_factor)
                scaled_img = resized.resize((scaled_size, scaled_size), Image.Resampling.LANCZOS)
                
                # Create transparent canvas at full size
                canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
                
                # Calculate centered offset, then apply custom offset
                center_offset_x = (size - scaled_size) // 2
                center_offset_y = (size - scaled_size) // 2
                final_offset_x = center_offset_x + offset_x
                final_offset_y = center_offset_y + offset_y
                
                # Paste scaled image with custom offset on canvas
                canvas.paste(scaled_img, (final_offset_x, final_offset_y), scaled_img)
                
                mipmap_dir = android_res_dir / mipmap_name
                mipmap_dir.mkdir(parents=True, exist_ok=True)
                
                dst_path = mipmap_dir / "ic_launcher_foreground.png"
                canvas.save(dst_path, "PNG")
                print(f"Created: {mipmap_name}/ic_launcher_foreground.png ({size}×{size}, scaled to {scaled_size}×{scaled_size})")
    except Exception as e:
        print(f"ERROR: Failed to create foreground PNGs: {e}")

def create_adaptive_icon_xmls():
    """Create adaptive icon XML files and background color XML"""
    root_dir = Path(__file__).parent
    android_res_dir = root_dir / "android" / "app" / "src" / "main" / "res"
    
    if not android_res_dir.exists():
        print(f"WARNING: Android res directory not found")
        return
    
    # Create background color XML
    print("Creating ic_launcher_background.xml...")
    values_dir = android_res_dir / "values"
    values_dir.mkdir(parents=True, exist_ok=True)
    
    bg_xml_path = values_dir / "ic_launcher_background.xml"
    bg_xml_content = '''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#050224</color>
</resources>
'''
    try:
        with open(bg_xml_path, 'w', encoding='utf-8') as f:
            f.write(bg_xml_content)
        print(f"Created: values/ic_launcher_background.xml")
    except Exception as e:
        print(f"ERROR: Failed to create background XML: {e}")
    
    # Create adaptive icon XMLs
    print("Creating adaptive icon XMLs...")
    adaptive_dir = android_res_dir / "mipmap-anydpi-v26"
    adaptive_dir.mkdir(parents=True, exist_ok=True)
    
    adaptive_xml_content = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    
    for xml_name in ["ic_launcher.xml", "ic_launcher_round.xml"]:
        xml_path = adaptive_dir / xml_name
        try:
            with open(xml_path, 'w', encoding='utf-8') as f:
                f.write(adaptive_xml_content)
            print(f"Created: mipmap-anydpi-v26/{xml_name}")
        except Exception as e:
            print(f"ERROR: Failed to create {xml_name}: {e}")

def install_safe_area_plugin():
    """Install @capacitor-community/safe-area@5.x plugin (compatible with Capacitor 6.x)"""
    root_dir = Path(__file__).parent
    package_json = root_dir / "package.json"
    
    if not package_json.exists():
        print("WARNING: package.json not found, skipping safe-area plugin check")
        return
    
    # Check if plugin is already installed
    try:
        with open(package_json, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if '@capacitor-community/safe-area' in content:
            print("✓ Safe-area plugin already installed")
            return
    except Exception as e:
        print(f"WARNING: Could not read package.json: {e}")
        return
    
    # Plugin not installed, install compatible version for Capacitor 6.x
    print("Installing @capacitor-community/safe-area@7.0.0 (compatible with Capacitor 6.x)...")
    try:
        npm_commands = [
            ["npm", "install", "@capacitor-community/safe-area@7.0.0"],
            [r"C:\Program Files\nodejs\npm.cmd", "install", "@capacitor-community/safe-area@7.0.0"]
        ]
        
        result = None
        for cmd in npm_commands:
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
            raise FileNotFoundError("npm command not found")
        
        print("✓ Safe-area plugin installed successfully")
        print(result.stdout)
        if result.stderr:
            print("Installation notes:")
            print(result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: npm install failed with exit code {e.returncode}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False
    except FileNotFoundError:
        print("ERROR: npm command not found. Make sure Node.js is installed and in PATH")
        return False

def copy_resized_pngs_to_android():
    """Copy resized PNGs to Android mipmap folders and update manifest"""
    root_dir = Path(__file__).parent
    android_res_dir = root_dir / "android" / "app" / "src" / "main" / "res"
    
    if not android_res_dir.exists():
        print(f"WARNING: Android res directory not found: {android_res_dir}")
        return
    
    # Map resized PNG sizes to Android mipmap folders (for ic_launcher.png)
    size_to_mipmap = {
        48: "mipmap-mdpi",
        72: "mipmap-hdpi",
        96: "mipmap-xhdpi",
        144: "mipmap-xxhdpi",
        192: "mipmap-xxxhdpi"
    }
    
    # Find and copy resized PNGs
    source_dir = None
    for possible_dir in [root_dir / "images", root_dir / "favicon", root_dir]:
        if possible_dir.exists():
            # Check if any resized PNG exists in this directory
            for size in size_to_mipmap.keys():
                png_path = possible_dir / f"mathinspace_{size}_{size}.png"
                if png_path.exists():
                    source_dir = possible_dir
                    break
        if source_dir:
            break
    
    if not source_dir:
        print("WARNING: No resized PNGs found. Run create_resized_pngs() first.")
        return
    
    print(f"Copying ic_launcher.png files from: {source_dir}")
    copied_count = 0
    
    for size, mipmap_name in size_to_mipmap.items():
        src_png = source_dir / f"mathinspace_{size}_{size}.png"
        
        if not src_png.exists():
            print(f"WARNING: Missing {src_png.name}")
            continue
        
        mipmap_dir = android_res_dir / mipmap_name
        mipmap_dir.mkdir(parents=True, exist_ok=True)
        
        dst_png = mipmap_dir / "ic_launcher.png"
        try:
            shutil.copy2(src_png, dst_png)
            print(f"Copied: {mipmap_name}/ic_launcher.png ({size}x{size})")
            copied_count += 1
        except Exception as e:
            print(f"ERROR: Failed to copy to {mipmap_name}: {e}")
    
    print(f"Successfully copied {copied_count} PNG files to Android mipmap folders")
    
    # Create foreground PNGs and adaptive icon XMLs
    print("\n=== Creating Adaptive Icon Setup ===")
    create_foreground_pngs()
    create_adaptive_icon_xmls()
    
    # Update AndroidManifest.xml
    print("\nUpdating AndroidManifest.xml...")
    manifest_path = root_dir / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    
    if not manifest_path.exists():
        print(f"WARNING: AndroidManifest.xml not found at {manifest_path}")
        return
    
    try:
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest_content = f.read()
        
        # Ensure android:icon is set
        if 'android:icon=' in manifest_content:
            manifest_content = re.sub(
                r'android:icon="[^"]*"',
                'android:icon="@mipmap/ic_launcher"',
                manifest_content
            )
        else:
            manifest_content = re.sub(
                r'(<application[^>]*?)(\s*>)',
                r'\1\n        android:icon="@mipmap/ic_launcher"\2',
                manifest_content
            )
        
        # Ensure android:roundIcon is set
        if 'android:roundIcon=' in manifest_content:
            manifest_content = re.sub(
                r'android:roundIcon="[^"]*"',
                'android:roundIcon="@mipmap/ic_launcher_round"',
                manifest_content
            )
        else:
            manifest_content = re.sub(
                r'(android:icon="@mipmap/ic_launcher")(\s+android:label)',
                r'\1\n        android:roundIcon="@mipmap/ic_launcher_round"\2',
                manifest_content
            )
        
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(manifest_content)
        
        print("Updated AndroidManifest.xml with adaptive icon references")
    except Exception as e:
        print(f"ERROR: Failed to update AndroidManifest.xml: {e}")

def main():
    # Paths
    root_dir = Path(__file__).parent
    main_index = root_dir / "index.html"
    www_dir = root_dir / "www"
    
    print("=== Math In Space - Index Sync to WWW ===")
    
    # Auto-increment version
    new_code, new_name = increment_version()
    if new_code:
        print(f"Building version {new_code} ({new_name})")
    
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
    
    # Create resized PNG versions
    print("\n=== Creating Resized PNG Versions ===")
    create_resized_pngs()
    
    # Copy resized PNGs to Android and update manifest
    print("\n=== Copying PNGs to Android Mipmap Folders ===")
    copy_resized_pngs_to_android()
    
    # Install safe-area plugin if needed
    print("\n=== Checking Safe-Area Plugin ===")
    install_safe_area_plugin()
    
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
