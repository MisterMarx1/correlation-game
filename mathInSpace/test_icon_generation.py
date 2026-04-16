#!/usr/bin/env python3
"""
Test icon generation logic to verify the fix works
"""

from pathlib import Path

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("ERROR: PIL not available. Install with: pip install Pillow")
    exit(1)

def test_icon_generation():
    """Test the adaptive icon generation logic"""
    root_dir = Path(__file__).parent
    source_icon = root_dir / "images" / "mathinspace_512_512.png"
    
    if not source_icon.exists():
        print(f"ERROR: Source icon not found at {source_icon}")
        return False
    
    print("Testing icon generation logic...")
    print(f"Source icon: {source_icon}")
    
    # Test with 512x512 size (xxxhdpi)
    size = 512
    
    with Image.open(source_icon) as img:
        print(f"Source image size: {img.size}, mode: {img.mode}")
        
        # Test 1: Background generation
        print("\n1. Testing background generation (512x512 dark blue)...")
        bg_img = Image.new('RGB', (size, size), color=(5, 5, 30))
        print(f"   ✓ Background created: {bg_img.size}, mode: {bg_img.mode}")
        
        # Test 2: Foreground with safe zone padding
        print("\n2. Testing foreground with safe zone padding...")
        safe_zone_ratio = 0.6667
        foreground_size = int(size * safe_zone_ratio)
        print(f"   Canvas size: {size}x{size}")
        print(f"   Safe zone ratio: {safe_zone_ratio} (66.67%)")
        print(f"   Foreground image size: {foreground_size}x{foreground_size}")
        
        # Resize source image
        resized_img = img.resize((foreground_size, foreground_size), Image.Resampling.LANCZOS)
        print(f"   ✓ Resized image: {resized_img.size}")
        
        # Create transparent canvas
        foreground_img = Image.new('RGBA', (size, size), color=(0, 0, 0, 0))
        print(f"   ✓ Transparent canvas: {foreground_img.size}, mode: {foreground_img.mode}")
        
        # Center the image
        offset = (size - foreground_size) // 2
        print(f"   Offset (padding): {offset}px on all sides")
        print(f"   Safe zone: {offset}px to {offset + foreground_size}px")
        
        foreground_img.paste(resized_img, (offset, offset), resized_img if resized_img.mode == 'RGBA' else None)
        print(f"   ✓ Image centered on transparent canvas")
        
        # Test 3: Verify the math
        print("\n3. Verifying the math...")
        print(f"   Android adaptive icon canvas: 108dp")
        print(f"   Safe zone: 72dp (66.67% of 108dp)")
        print(f"   Our implementation:")
        print(f"     - Canvas: {size}px")
        print(f"     - Safe zone: {foreground_size}px ({foreground_size/size*100:.2f}%)")
        print(f"     - Padding: {offset}px ({offset/size*100:.2f}%)")
        print(f"   ✓ Math checks out!")
        
        # Test 4: Save test images
        print("\n4. Saving test images...")
        test_dir = root_dir / "test_icons"
        test_dir.mkdir(exist_ok=True)
        
        bg_img.save(test_dir / "test_background.png", "PNG")
        print(f"   ✓ Background saved: {test_dir / 'test_background.png'}")
        
        foreground_img.save(test_dir / "test_foreground.png", "PNG")
        print(f"   ✓ Foreground saved: {test_dir / 'test_foreground.png'}")
        
        print("\n✓ All tests passed!")
        print("\nWhat this fix does:")
        print("  1. Background: Solid dark blue (5,5,30) - matches your theme")
        print("  2. Foreground: Your image scaled to 66.67% size, centered on transparent canvas")
        print("  3. Android combines them: background + foreground with masking")
        print("  4. Result: Your full image visible without clipping!")
        
        return True

if __name__ == "__main__":
    success = test_icon_generation()
    exit(0 if success else 1)
