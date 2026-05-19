import sys
import json
import re
import argparse

def rgb_to_hex(r, g, b):
    return '#{:02x}{:02x}{:02x}'.format(r, g, b).lower()

def main():
    parser = argparse.ArgumentParser(description="Convert a .c file with uint32_t pixel data to GitPet Sprite JSON.")
    parser.add_argument("input_c", help="Path to input .c file")
    parser.add_argument("output_json", help="Path to output JSON file")
    parser.add_argument("--transparent", default="0xff000000", help="Hex color to treat as transparent (e.g., 0xff000000)")
    parser.add_argument("--format", default="argb", choices=["argb", "abgr"], help="Byte order of the uint32_t values (default: argb)")

    args = parser.parse_args()

    try:
        with open(args.input_c, 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    # Try to find dimensions in macros
    width_match = re.search(r'#define\s+\w+_WIDTH\s+(\d+)', content)
    height_match = re.search(r'#define\s+\w+_HEIGHT\s+(\d+)', content)
    
    macro_width = int(width_match.group(1)) if width_match else 0
    macro_height = int(height_match.group(1)) if height_match else 0

    # Extract the data array
    # Looking for something like: static const uint32_t name[1][1024] = { { ... } };
    match = re.search(r'\{[\s\n]*\{([\s\S]*?)\}[\s\n]*\}', content)
    if not match:
        # Try a simpler match if nested braces aren't found
        match = re.search(r'=\s*\{([\s\S]*?)\}\s*;', content)
        if not match:
            print("Error: Could not find pixel data array in .c file.")
            sys.exit(1)

    data_str = match.group(1)
    # Clean up comments and whitespace
    data_str = re.sub(r'/\*.*?\*/', '', data_str)
    # Extract hex values
    hex_values = re.findall(r'0x[0-9a-fA-F]+', data_str)

    if not hex_values:
        print("Error: No hex values found in the data array.")
        sys.exit(1)

    # Use macros if found, otherwise guess
    if macro_width > 0 and macro_height > 0:
        width = macro_width
        height = macro_height
    else:
        width = 32
        height = 32
        if len(hex_values) != 1024:
            print(f"Warning: Found {len(hex_values)} values, expected 1024 for 32x32. Adjusting dimensions if possible.")
            if len(hex_values) == 256:
                width = 16
                height = 16
            else:
                # Try to guess or just use 32 as width
                height = len(hex_values) // 32
                width = 32

    palette_keys_map = {0: None}
    hex_to_index = {}
    current_index = 1
    
    # Process colors
    frame_grid = []
    for r in range(height):
        row = []
        for c in range(width):
            idx_in_data = r * width + c
            if idx_in_data >= len(hex_values):
                row.append(0)
                continue
                
            raw_val = hex_values[idx_in_data].lower()
            
            # Check transparency
            if raw_val == args.transparent.lower():
                row.append(0)
                continue
            
            # Parse ARGB or ABGR
            val = int(raw_val, 16)
            a = (val >> 24) & 0xff
            
            if args.format == "abgr":
                # 0xaabbggrr -> R is lowest, B is highest (after alpha)
                b_val = (val >> 16) & 0xff
                g_val = (val >> 8) & 0xff
                r_val = val & 0xff
            else:
                # 0xaarrggbb -> R is highest, B is lowest
                r_val = (val >> 16) & 0xff
                g_val = (val >> 8) & 0xff
                b_val = val & 0xff
            
            if a < 128: # If alpha is low, treat as transparent
                row.append(0)
                continue
                
            hex_color = rgb_to_hex(r_val, g_val, b_val)
            
            if hex_color not in hex_to_index:
                hex_to_index[hex_color] = current_index
                palette_keys_map[current_index] = hex_color
                current_index += 1
            
            row.append(hex_to_index[hex_color])
        frame_grid.append(row)

    # Construct GitPet JSON format
    sprite_data = {
        "width": width,
        "height": height,
        "scale": 4 if height > 32 else 5,
        "palette": {str(k): v for k, v in palette_keys_map.items()},
        "groups": {
            "body": []
        },
        "animations": {
            "idle": {
                "group": "body",
                "keyframes": "0% { transform: translateY(0); } 50% { transform: translateY(-2px); } 100% { transform: translateY(0); }",
                "duration": "2s"
            }
        },
        "frames": {
            "default": frame_grid
        }
    }

    with open(args.output_json, 'w') as f:
        json.dump(sprite_data, f, indent=2)

    print(f"Successfully converted {args.input_c} to {args.output_json}")
    print(f"Palette size: {len(hex_to_index)} colors.")

if __name__ == "__main__":
    main()
