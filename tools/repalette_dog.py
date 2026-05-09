import json
import sys

def get_luminance(hex_color):
    if not hex_color or not hex_color.startswith('#'):
        return 0
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join([c*2 for c in hex_color])
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    # Relative luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def repalette(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    old_palette = data['palette']
    
    # Sort indices by luminance
    colors = []
    for idx, hex_val in old_palette.items():
        if idx == "0" or hex_val is None:
            continue
        colors.append((idx, get_luminance(hex_val)))
    
    colors.sort(key=lambda x: x[1])
    
    new_palette = {"0": None}
    n = len(colors)
    for i, (idx, lum) in enumerate(colors):
        # Divide into 5 groups
        rank = i / n
        if rank < 0.15:
            key = 'outline'
        elif rank < 0.45:
            key = 'secondary'
        elif rank < 0.8:
            key = 'primary'
        elif rank < 0.95:
            key = 'highlight'
        else:
            key = 'eyeHighlight'
        new_palette[idx] = key
    
    data['palette'] = new_palette
    data['scale'] = 4 # Reduced scale for 32x32 sprites
    
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    for path in sys.argv[1:]:
        repalette(path)
