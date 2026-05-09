import subprocess
import json

color_map = json.dumps({
    "#1e242c": "outline",
    "#4ecca3": "base",
    "#399e82": "shadow",
    "#ffffff": "eye",
    "#f1c40f": "accent1"
})

subprocess.run([
    "python", "tools/png_to_sprite.py", 
    "test_owl.png", 
    "src/sprites/traits/lone_coder_stage2.json", 
    "--scale", "5", 
    "--color-map", color_map
])
