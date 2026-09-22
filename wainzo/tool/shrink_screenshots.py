"""Shrink the captured screens for the README.

`test/screenshots.dart` writes at 3x into `screenshots/`, which is seven
megabytes and not worth versioning. This resamples them to 1x into
`docs/screenshots/`, which is what the README points at.

    flutter test --update-goldens test/screenshots.dart
    python3 tool/shrink_screenshots.py
"""
import os
import sys

from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else 'screenshots'
DST = sys.argv[2] if len(sys.argv) > 2 else 'docs/screenshots'
WIDTH = 430  # the logical width the screens are captured at

os.makedirs(DST, exist_ok=True)
total = 0
for name in sorted(os.listdir(SRC)):
    if not name.endswith('.png'):
        continue
    image = Image.open(os.path.join(SRC, name)).convert('RGB')
    height = round(image.height * WIDTH / image.width)
    image.resize((WIDTH, height), Image.LANCZOS).save(
        os.path.join(DST, name), optimize=True
    )
    total += os.path.getsize(os.path.join(DST, name))

print(f'{len(os.listdir(DST))} screenshots, {total // 1024} KB in {DST}')
