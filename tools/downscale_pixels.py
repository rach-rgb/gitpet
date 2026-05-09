from PIL import Image
import os

def downscale_pixel_art(input_path, output_path, size=(32, 32)):
    img = Image.open(input_path)
    # Use nearest neighbor to preserve pixel art look
    img_small = img.resize(size, Image.NEAREST)
    img_small.save(output_path)
    print(f"Downscaled {input_path} to {size} and saved to {output_path}")

files = ['owl3.png', 'owl4.png', 'owl5.png']
base_dir = 'assets/pixelize'

for f in files:
    path = os.path.join(base_dir, f)
    if os.path.exists(path):
        downscale_pixel_art(path, path)
    else:
        print(f"File not found: {path}")
