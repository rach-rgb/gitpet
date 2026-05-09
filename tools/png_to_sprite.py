import sys
import json
import argparse
from PIL import Image

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2]).lower()

def main():
    parser = argparse.ArgumentParser(description="Convert a 32x32 PNG to GitPet Sprite JSON.")
    parser.add_argument("input_png", help="Path to input 32x32 PNG file")
    parser.add_argument("output_json", help="Path to output JSON file")
    parser.add_argument("--scale", type=int, default=5, help="Scale factor for SVG rendering")
    parser.add_argument("--color-map", default="{}", help="JSON string mapping hex colors to palette keys (e.g., '{\"#1e242c\": \"outline\"}')")

    args = parser.parse_args()

    try:
        color_map = json.loads(args.color_map)
    except json.JSONDecodeError:
        print("Error: --color-map must be a valid JSON string.")
        sys.exit(1)

    try:
        img = Image.open(args.input_png).convert("RGBA")
    except Exception as e:
        print(f"Error loading image: {e}")
        sys.exit(1)

    if img.width != 32 or img.height != 32:
        print(f"Warning: Image is {img.width}x{img.height}, not 32x32. Continuing anyway, but this is not recommended.")

    width, height = img.size
    pixels = img.load()

    # Automatically discover colors and assign keys if not in color_map
    palette_keys_map = {
        0: None
    }
    
    # Track used colors
    unique_colors = set()
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 128:  # Not fully transparent
                hex_color = rgb_to_hex((r, g, b))
                unique_colors.add(hex_color)

    # Assign indices
    hex_to_index = {}
    current_index = 1
    
    # First, process colors defined in color_map
    for hex_color, key in color_map.items():
        hex_color_lower = hex_color.lower()
        if hex_color_lower in unique_colors:
            palette_keys_map[current_index] = key
            hex_to_index[hex_color_lower] = current_index
            current_index += 1
            unique_colors.remove(hex_color_lower)

    # Then, any leftover colors get generic names
    unmapped_keys = ['base', 'shadow', 'highlight', 'accent1', 'accent2', 'eye', 'eyeHighlight']
    unmapped_idx = 0
    for hex_color in unique_colors:
        assigned_key = hex_color # Use literal hex as key for high-fidelity fallback
        if unmapped_idx < len(unmapped_keys):
            # We skip named keys for high-fidelity sprites to avoid palette conflicts
            pass
            
        palette_keys_map[current_index] = assigned_key
        hex_to_index[hex_color] = current_index
        current_index += 1

    # Generate frame grid
    frame_grid = []
    for y in range(height):
        row = []
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 128:
                hex_color = rgb_to_hex((r, g, b))
                idx = hex_to_index[hex_color]
                row.append(idx)
            else:
                row.append(0)
        frame_grid.append(row)

    # Construct GitPet JSON format
    sprite_data = {
        "width": width,
        "height": height,
        "scale": args.scale,
        "palette": {str(k): v for k, v in palette_keys_map.items()},
        "groups": {
            "body": [] # We can leave this empty or populate it. The renderer currently uses 'body' for all ungrouped pixels.
        },
        "animations": {
            "idle": {
                "group": "body",
                "keyframes": "0% { transform: translateY(0); } 50% { transform: translateY(-1px); } 100% { transform: translateY(0); }",
                "duration": "2s"
            }
        },
        "frames": {
            "default": frame_grid
        }
    }

    with open(args.output_json, 'w') as f:
        json.dump(sprite_data, f, indent=2)

    print(f"Successfully converted {args.input_png} to {args.output_json}")
    print("Palette mapping used:")
    for idx, key in palette_keys_map.items():
        if idx != 0:
            hex_col = next((h for h, i in hex_to_index.items() if i == idx), "unknown")
            print(f"  {hex_col} -> {key}")

if __name__ == "__main__":
    main()
