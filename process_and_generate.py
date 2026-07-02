import os
import re
import random
import json
from PIL import Image, ImageOps

DRIVE_DIR = 'drive_images'
IMAGES_DIR = 'images'
JS_FILE = 'gallery-data.js'
CONFIG_FILE = 'gallery-config.json'

# Ensure output directory exists
os.makedirs(IMAGES_DIR, exist_ok=True)

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {CONFIG_FILE}: {e}")
    return {}

def save_config(config):
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Error saving {CONFIG_FILE}: {e}")

def clean_name(filename):
    name, ext = os.path.splitext(filename)
    # Convert to lowercase, replace special chars and spaces with underscores
    cleaned = re.sub(r'[^a-zA-Z0-9_\-]', '_', name.lower())
    cleaned = re.sub(r'_+', '_', cleaned).strip('_')
    return f"{cleaned}.jpg"

def optimize_image(src_path, dest_path, rotate_angle=0):
    try:
        with Image.open(src_path) as img:
            # 1. Auto-orient based on EXIF tag
            img = ImageOps.exif_transpose(img)
            
            # 2. Apply manual rotation if specified in config (clockwise rotation)
            if rotate_angle in [90, 180, 270]:
                # rotate accepts counter-clockwise, so we use negative angle
                img = img.rotate(-rotate_angle, expand=True)
                print(f"Manually rotated {src_path} by {rotate_angle} degrees")
                
            w, h = img.size
            max_dim = 2000  
            
            # 3. Resize if dimensions exceed max_dim
            if w > max_dim or h > max_dim:
                if w > h:
                    new_w = max_dim
                    new_h = int(h * (max_dim / w))
                else:
                    new_h = max_dim
                    new_w = int(w * (max_dim / h))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            img.save(dest_path, 'JPEG', quality=82, optimize=True)
            return True
    except Exception as e:
        print(f"Error processing {src_path}: {e}")
        return False

def get_image_span(filepath):
    try:
        with Image.open(filepath) as img:
            w, h = img.size
            if w > h * 1.15: # Landscape orientation
                return 'landscape'
            elif h > w * 1.15: # Portrait orientation
                return 'portrait'
            else: # Square
                return 'square'
    except Exception as e:
        print(f"Error reading dims for {filepath}: {e}")
        return 'portrait'

PREMIUM_TITLES = [
    "Sartorial Shadows", "Ethereal Nocturne", "Chiaroscuro Silhouette", "Celestial Horizon",
    "Subterranean Glow", "Prismatic Exposure", "Velvet Mirage", "Monochrome Grace",
    "Vogue Editorial", "Liquid Reflection", "Solitary Motion", "Amber Vignette",
    "Gilded Echoes", "Crimson Zenith", "Halcyon Dusk", "Luminescent Frame",
    "Infinite Exposure", "Focal Harmony", "Aura of Light", "Nebula Focus",
    "Opulent Contrast", "Minimalist Structure", "Elysian Portrait", "Chasing Radiance",
    "Vortical Bloom", "Enigmatic Glance", "Symphony of Motion", "Timeless Capture",
    "Obsidian Shadow", "Sublime Vignette", "Ethereal Whispers", "Astral Light",
    "Stellar Focus", "Vintage Frame", "Infinite Clickz", "Spectra Editorial",
    "Golden Contrast", "Velvet Exposure", "Sartorial Grace", "Nocturnal Portrait"
]

def generate_default_title(filename):
    name, _ = os.path.splitext(filename)
    clean = re.sub(r'^(aks|dsc|dsc_|img)_', '', name, flags=re.IGNORECASE)
    clean = clean.replace('_', ' ').replace('-', ' ').strip()
    
    digits = re.sub(r'\D', '', name)
    if not clean or clean.isdigit() or len(clean) < 3 or (digits and len(digits) > 4):
        val = sum(int(d) for d in digits) if digits else len(name)
        idx = val % len(PREMIUM_TITLES)
        return PREMIUM_TITLES[idx]
        
    return clean.title()

def main():
    # Load existing overrides configuration
    config = load_config()
    reprocessed_images = set()

    # 1. Process images from drive_images
    if os.path.exists(DRIVE_DIR):
        print(f"Processing images from '{DRIVE_DIR}'...")
        files = os.listdir(DRIVE_DIR)
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png']:
                src_path = os.path.join(DRIVE_DIR, f)
                cleaned_filename = clean_name(f)
                dest_path = os.path.join(IMAGES_DIR, cleaned_filename)
                
                # Check config for manual rotation
                rotate_val = config.get(cleaned_filename, {}).get('rotate', 0)
                
                # Reprocess if missing, source is newer, or rotation override is active
                if not os.path.exists(dest_path) or rotate_val > 0 or os.path.getmtime(src_path) > os.path.getmtime(dest_path):
                    if optimize_image(src_path, dest_path, rotate_angle=rotate_val):
                        reprocessed_images.add(cleaned_filename)
        
        # Specific copy for founder.jpg (landscape photo of the founder)
        founder_file = next((f for f in files if 'dsc05135' in f.lower()), None)
        if founder_file:
            # Apply rotate if configured for founder.jpg
            rotate_val = config.get('founder.jpg', {}).get('rotate', 0)
            optimize_image(os.path.join(DRIVE_DIR, founder_file), os.path.join(IMAGES_DIR, 'founder.jpg'), rotate_angle=rotate_val)
    else:
        print(f"'{DRIVE_DIR}' not found. Scanning '{IMAGES_DIR}' directly...")

    # 2. Scan IMAGES_DIR to build config and optimize
    all_images = []
    if os.path.exists(IMAGES_DIR):
        for f in os.listdir(IMAGES_DIR):
            ext = os.path.splitext(f)[1].lower()
            if ext in ['.jpg', '.jpeg', '.png']:
                filepath = os.path.join(IMAGES_DIR, f)
                # Optimize large files in-place if placed directly in images/
                if ext == '.png' or (os.path.getsize(filepath) > 800 * 1024 and f not in reprocessed_images):
                    cleaned_name = clean_name(f)
                    new_filepath = os.path.join(IMAGES_DIR, cleaned_name)
                    rotate_val = config.get(cleaned_name, {}).get('rotate', 0)
                    if optimize_image(filepath, new_filepath, rotate_angle=rotate_val):
                        if filepath != new_filepath:
                            try: os.remove(filepath)
                            except: pass
                        all_images.append(cleaned_name)
                else:
                    all_images.append(f)

    # Exclude founder photo from the dynamic grid gallery
    all_images = [img for img in all_images if img not in ['founder.jpg', 'dsc05135_2.jpg']]
    all_images.sort()

    if not all_images:
        print("No images found in images/ folder!")
        return

    # 3. Build/Update config mappings so the user has an auto-filled list of properties to edit
    updated_config = {}
    categories = ['Cinematic', 'Editorial', 'Portrait', 'Fashion']
    captions = [
        "Capturing cinematic lighting and minimalist composition.",
        "Emphasizing shadow contrasts, depth, and elegant details.",
        "Chasing light and freezing motion at high speed.",
        "A premium editorial study in luxury photography."
    ]

    # Pre-populate founder photo defaults if missing
    if 'founder.jpg' not in config:
        config['founder.jpg'] = {
            'title': 'The Art of Motion',
            'category': 'Vision',
            'span': 'portrait',
            'rotate': 0,
            'caption': 'AKSA Infinite Clickz artistic vision statement.'
        }
    updated_config['founder.jpg'] = config['founder.jpg']

    for i, img in enumerate(all_images):
        filepath = os.path.join(IMAGES_DIR, img)
        default_span = get_image_span(filepath)
        default_title = generate_default_title(img)
        default_cat = categories[i % len(categories)]
        default_caption = captions[i % len(captions)]

        # Keep existing custom configurations, otherwise use auto-detected defaults
        existing = config.get(img, {})
        default_pos = 'center 20%' if default_span == 'portrait' else 'center'
        updated_config[img] = {
            'title': existing.get('title', default_title),
            'category': existing.get('category', default_cat),
            'span': existing.get('span', default_span),
            'rotate': existing.get('rotate', 0), # 0, 90, 180, 270 degrees clockwise
            'position': existing.get('position', default_pos), # default object-position to prevent head cut
            'caption': existing.get('caption', default_caption)
        }

    # Save the updated gallery-config.json
    save_config(updated_config)
    print(f"Updated {CONFIG_FILE} with all current image parameters!")

    # 4. Generate HERO_IMAGES and GALLERY_DATA configurations
    hero_candidates = [img for img in all_images if img.startswith('hero')]
    if len(hero_candidates) < 4:
        # Select 4 diverse images spaced out across the sorted list
        n = len(all_images)
        hero_indices = [0, n // 4, n // 2, (3 * n) // 4]
        hero_candidates = [all_images[idx] for idx in hero_indices]
        gallery_candidates = [img for i, img in enumerate(all_images) if i not in hero_indices]
    else:
        gallery_candidates = [img for img in all_images if not img.startswith('hero')]

    # Fill hero slots
    hero_slots = {
        'leftTop': 'images/' + hero_candidates[0] if len(hero_candidates) > 0 else '',
        'leftBottom': 'images/' + hero_candidates[1] if len(hero_candidates) > 1 else '',
        'rightTop': 'images/' + hero_candidates[2] if len(hero_candidates) > 2 else '',
        'rightBottom': 'images/' + hero_candidates[3] if len(hero_candidates) > 3 else ''
    }

    # Fallback repeats
    for key, val in hero_slots.items():
        if not val and all_images:
            hero_slots[key] = 'images/' + random.choice(all_images)

    gallery_data_js_content = []
    for img in gallery_candidates:
        meta = updated_config[img]
        t = meta['title'].replace("'", "\\'")
        cat = meta['category'].replace("'", "\\'")
        cap = meta['caption'].replace("'", "\\'")
        pos = meta.get('position', 'center')
        gallery_data_js_content.append(f"""  {{
    src: 'images/{img}',
    title: '{t}',
    category: '{cat}',
    span: '{meta['span']}',
    position: '{pos}',
    caption: '{cap}'
  }}""")

    # Get hero titles safely escaped
    left_top_img = os.path.basename(hero_slots['leftTop'])
    left_bottom_img = os.path.basename(hero_slots['leftBottom'])
    right_top_img = os.path.basename(hero_slots['rightTop'])
    right_bottom_img = os.path.basename(hero_slots['rightBottom'])

    title_lt = updated_config[left_top_img]['title'].replace("'", "\\'")
    title_lb = updated_config[left_bottom_img]['title'].replace("'", "\\'")
    title_rt = updated_config[right_top_img]['title'].replace("'", "\\'")
    title_rb = updated_config[right_bottom_img]['title'].replace("'", "\\'")

    # Write out the gallery-data.js file
    js_output = f"""/**
 * AKSA INFINITE CLICKZ - Portfolio Data Configuration
 * 
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Edit 'gallery-config.json' to change image spans (portrait/landscape), titles, or rotations!
 * Run 'Update Gallery.bat' to apply changes.
 */

// 1. HERO SECTION IMAGES (3-Column Grid Scatter Cards)
const HERO_IMAGES = {{
  leftTop: {{
    src: '{hero_slots['leftTop']}',
    title: '{title_lt}'
  }},
  leftBottom: {{
    src: '{hero_slots['leftBottom']}',
    title: '{title_lb}'
  }},
  rightTop: {{
    src: '{hero_slots['rightTop']}',
    title: '{title_rt}',
    badge: 'High-Speed Focal Precision'
  }},
  rightBottom: {{
    src: '{hero_slots['rightBottom']}',
    title: '{title_rb}'
  }}
}};

// 2. OUR WORK GALLERY (Asymmetric Masonry Grid)
const GALLERY_DATA = [
{','.join(gallery_data_js_content)}
];
"""

    with open(JS_FILE, 'w', encoding='utf-8') as f:
        f.write(js_output)

    print(f"Successfully generated {JS_FILE} with {len(gallery_candidates)} gallery items!")

if __name__ == '__main__':
    main()
