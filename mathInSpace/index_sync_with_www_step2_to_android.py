#!/usr/bin/env python3
"""
Quick Android sync - run Capacitor sync to deploy www to Android
"""

import os
import subprocess
import re
import shutil
from pathlib import Path

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

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

def verify_android_launcher_icons():
    """Verify launcher icons exist and are properly sized"""
    root_dir = Path(__file__).parent
    android_res_dir = root_dir / "android" / "app" / "src" / "main" / "res"
    
    if not android_res_dir.exists():
        print("WARNING: Android res directory not found")
        return False
    
    # Required mipmap directories and sizes
    # Note: xxxxxhdpi is not supported by Android, use xxxhdpi for 512x512
    mipmap_configs = [
        ("mipmap-mdpi", 48),
        ("mipmap-hdpi", 72),
        ("mipmap-xhdpi", 96),
        ("mipmap-xxhdpi", 144),
        ("mipmap-xxxhdpi", 512)  # Use xxxhdpi for 512x512 (highest supported)
    ]
    
    all_good = True
    missing_icons = []
    
    for mipmap_name, expected_size in mipmap_configs:
        mipmap_dir = android_res_dir / mipmap_name
        
        # Check ALL launcher icon variations
        # Generate CORRECTIVE adaptive foreground that fills canvas
        icon_variations = [
            ("ic_launcher.png", expected_size),
            ("ic_launcher_foreground.png", expected_size),  # SAME SIZE as main - fills canvas completely
            ("ic_launcher_round.png", expected_size)  # Round version same size as main
        ]
        
        for icon_name, expected_icon_size in icon_variations:
            icon_path = mipmap_dir / icon_name
            
            if not icon_path.exists():
                missing_icons.append(f"{mipmap_name}/{icon_name}")
                all_good = False
            else:
                # Verify size if PIL is available
                if PIL_AVAILABLE:
                    try:
                        with Image.open(icon_path) as img:
                            actual_size = img.size
                            if actual_size != (expected_icon_size, expected_icon_size):
                                print(f"WARNING: {mipmap_name}/{icon_name} size is {actual_size}, expected {expected_icon_size}x{expected_icon_size}")
                                all_good = False
                    except Exception as e:
                        print(f"WARNING: Could not verify {mipmap_name}/{icon_name}: {e}")
                        all_good = False
    
    if all_good:
        print("All launcher icons verified successfully")
        return True
    else:
        print("WARNING: Launcher icon issues detected:")
        for missing in missing_icons:
            print(f"  - Missing: {missing}")
        return False

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

def copy_resized_pngs_to_android():
    """Copy resized PNGs to Android mipmap folders and update manifest"""
    root_dir = Path(__file__).parent
    android_res_dir = root_dir / "android" / "app" / "src" / "main" / "res"
    
    if not android_res_dir.exists():
        print(f"WARNING: Android res directory not found: {android_res_dir}")
        return False
    
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
        print("WARNING: No resized PNGs found.")
        return False
    
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
    
    if copied_count == 0:
        return False
    
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
        return copied_count > 0
    
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
        return True
    except Exception as e:
        print(f"ERROR: Failed to update AndroidManifest.xml: {e}")
        return copied_count > 0

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
        
        # Copy resized PNGs to Android mipmap folders
        print("\n=== Copying PNGs to Android Mipmap Folders ===")
        copy_resized_pngs_to_android()
        
        # Apply AdMob configuration after sync
        print("\nApplying AdMob configuration...")
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
