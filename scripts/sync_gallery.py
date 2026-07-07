import os
import json
import traceback
from PIL import Image

# Import pillow-heif if available
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIF_SUPPORT = True
except ImportError:
    HEIF_SUPPORT = False
    print("Warning: pillow-heif is not installed. HEIC conversion will be skipped.")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVENTS_DIR = os.path.join(BASE_DIR, "images", "Events")
OUTPUT_JS = os.path.join(BASE_DIR, "gallery-data.js")

print(f"Base Directory: {BASE_DIR}")
print(f"Events Directory: {EVENTS_DIR}")

def get_category(folder_name):
    name_lower = folder_name.lower()
    if "hack" in name_lower or "codestorm" in name_lower or "fest" in name_lower:
        return "hackathons"
    elif "copilot" in name_lower or "ai for all" in name_lower:
        return "workshops"
    elif "speaker" in name_lower or "talk" in name_lower:
        return "speaker-sessions"
    elif "meetup" in name_lower or "community" in name_lower:
        return "meetups"
    elif "collab" in name_lower or "team" in name_lower:
        return "team-collabs"
    elif "techsangam" in name_lower or "sangam" in name_lower:
        return "meetups"
    else:
        return "networking"

def get_description(folder_name):
    name_lower = folder_name.lower()
    if "ai for all" in name_lower:
        return "Highlights from our 'AI For All' workshops and community developer sessions."
    elif "codestorm" in name_lower:
        return "Teams building and competing overnight to build functional prototypes at Codestorm Hackathon."
    elif "copilot" in name_lower:
        return "Hands-on coding, developer sessions, and talks from the GitHub Copilot Dev Day."
    elif "trae" in name_lower or "hack fest" in name_lower:
        return "High-intensity coding, panels, and project demos at TRAE Presents Hack Fest 2026."
    elif "techsangam" in name_lower or "sangam" in name_lower:
        return "A vibrant confluence of tech enthusiasts, speakers, and innovators at Techsangam 2.0."
    else:
        return f"Explore moments of innovation and developer community collaboration at {folder_name}."

def convert_heic_to_jpg(heic_path):
    if not HEIF_SUPPORT:
        return None
    
    # Generate output path
    base, _ = os.path.splitext(heic_path)
    jpg_path = base + "_converted.jpg"
    
    if os.path.exists(jpg_path):
        return jpg_path
    
    try:
        print(f"Converting HEIC: {heic_path} -> {jpg_path}")
        image = Image.open(heic_path)
        image.save(jpg_path, "JPEG", quality=90)
        return jpg_path
    except Exception as e:
        print(f"Failed to convert {heic_path}: {e}")
        traceback.print_exc()
        return None

def main():
    if not os.path.exists(EVENTS_DIR):
        print(f"Error: Events directory does not exist at {EVENTS_DIR}")
        return

    events_data = []

    # Read subdirectories of Events
    for folder_name in sorted(os.listdir(EVENTS_DIR)):
        folder_path = os.path.join(EVENTS_DIR, folder_name)
        if not os.path.isdir(folder_path):
            continue
        
        print(f"\nProcessing event folder: {folder_name}")
        images_list = []
        
        # Walk through files recursively
        for root, _, files in os.walk(folder_path):
            for file in files:
                # Skip temp/trash files
                if file.startswith(".") or "trashed" in file.lower():
                    continue
                
                file_path = os.path.join(root, file)
                _, ext = os.path.splitext(file.lower())
                
                # If HEIC image, convert it to JPEG
                if ext in [".heic", ".heif"]:
                    converted = convert_heic_to_jpg(file_path)
                    if converted:
                        file_path = converted
                        ext = ".jpg"
                    else:
                        continue # Skip if conversion failed
                
                # Check for standard image formats
                if ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
                    # Create path relative to the root workspace
                    rel_path = os.path.relpath(file_path, BASE_DIR)
                    # Normalize to web-friendly slashes
                    web_path = rel_path.replace("\\", "/")
                    images_list.append(web_path)
        
        if images_list:
            # Sort images to maintain consistent order
            images_list.sort()
            
            events_data.append({
                "id": folder_name.lower().replace(" ", "-"),
                "name": folder_name,
                "category": get_category(folder_name),
                "description": get_description(folder_name),
                "images": images_list
            })
            print(f"Found {len(images_list)} images for {folder_name}")
        else:
            print(f"No images found for {folder_name}")

    # Write JS file
    try:
        with open(OUTPUT_JS, "w", encoding="utf-8") as f:
            f.write("// Auto-generated by sync_gallery.py\n")
            f.write("const galleryEvents = ")
            f.write(json.dumps(events_data, indent=2))
            f.write(";\n")
        print(f"\nSuccessfully wrote gallery data to {OUTPUT_JS}")
    except Exception as e:
        print(f"Failed to write output JS: {e}")

if __name__ == "__main__":
    main()
