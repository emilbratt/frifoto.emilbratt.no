#!/usr/bin/env python3

# After processing, this will hold all the structured information we need
IMAGE_STRUCTURED = {
    'all_images': [
        # [img0, img1,.. ]
    ],
    'by_tag': {
        # tag_a -> [img0, img1,..], tag_b -> [img1, img2,..],..
    },
    'by_rating': {
        # 1 -> [img0, img1,..], 2 -> [img1, img2,..], 3 -> ..
    },
    'by_filename': {
        # img0: { focal: f5, shutter: 1/1600,.. },..
    },
    'directory': {
        # path to images
    }
}
# List all images found in the image directory.
NOT_INCLUDED = []
CONFIG_FILE = 'add_images.toml'

import tomllib
from pathlib import Path
from shutil import which
import json
import os
import subprocess
import sys

f = open(CONFIG_FILE, "rb")
DATA = tomllib.load(f)
f.close()

IMAGE_STRUCTURED['directory'] = DATA['config']['image_directory']

print(f"Before starting, edit {CONFIG_FILE} and make sure the images exists inside {DATA['config']['image_directory']}")
opt = input('Continue [y/N]: ');
if opt.lower() != 'y': sys.exit()

if which('exiftool') is None:
    sys.exit('"exiftool" is not installed, install with "sudo dnf install exiftool" (fedora)')
if which('magick') is None:
    sys.exit('"magick" is not installed, install with "sudo dnf install magick" (fedora)')

def validate_all_images_exists(images):
    for image in DATA['images']:
        found = False
        for f in images:
            if image == f.name: found = True
        if not found: sys.exit(f"{image} not found in {DATA['config']['image_directory']}")

def get_exif(rawe, key_list):
    for key in key_list:
        if key in rawe:
            return rawe[key]
    return None

images = [f for f in Path(DATA['config']['image_directory']).iterdir() if f.is_file()]
validate_all_images_exists(images)

# CREATE IMAGE DATA FOR JAVASCRIPT
total,step = len(DATA['images'].keys()),0
for f in images:
    if f.name not in DATA['images']:
        NOT_INCLUDED.append(f.name)
        continue

    step += 1
    progress = int(step / total * 100)
    print(f'[{progress}%]\tReading exif for {f}')
    rawe = None # RAW EXIF DATA
    try:
        result = subprocess.run(
            ["exiftool", "-json", f],
            capture_output=True,
            text=True,
            check=True
        )
        d = json.loads(result.stdout)
        rawe = d[0] # json.loads will always create an array with the content inside it
    except:
        sys.exit(f'failed to read exif data for {f.name}')

    if rawe is None: sys.exit(f'failed to extract exif data for {f.name}')

    exif = {
        'capture_time': get_exif(rawe, ["DateTimeOriginal"]),
        'camera': get_exif(rawe, ["Model"]),
        'lens': get_exif(rawe, ["LensID", "LensModel", "Lens"]),
        'file_size': get_exif(rawe, ["FileSize"]),
        'image_width': get_exif(rawe, ["ImageWidth"]),
        'image_height': get_exif(rawe, ["ImageHeight"]),
        'shooting_mode': get_exif(rawe, ["ShootingMode"]),
        'ISO': get_exif(rawe, ["ISO", "BaseISO"]),
        'aperture': get_exif(rawe, ["Aperture", "ApertureValue", "FNumber"]),
        'shutter_speed': get_exif(rawe, ["ExposureTime", "ShutterSpeed"]),
        'focal': get_exif(rawe, ["FocalLength", "Lens"]),
    }
    for alias,data in exif.items():
        if data == None:
            sys.exit(f"ERRIR: EXIF field '{alias}' not found for image: {f.name}")

    IMAGE_STRUCTURED['all_images'].append(f.name)

    IMAGE_STRUCTURED['by_filename'][f.name] = {}
    DATA['images'][f.name]['tags'].sort()

    IMAGE_STRUCTURED['by_filename'][f.name]['tags'] = DATA['images'][f.name]['tags']

    for k,metadata in exif.items():
        IMAGE_STRUCTURED['by_filename'][f.name][k] = metadata

    rating = DATA['images'][f.name].get('rating', -1) # '-1' just means that rating is not specified..
    if rating not in IMAGE_STRUCTURED['by_rating']:
        IMAGE_STRUCTURED['by_rating'][rating] = []
    IMAGE_STRUCTURED['by_rating'][rating].append(f.name)

    for tag in DATA['images'][f.name]['tags']:
        if tag not in IMAGE_STRUCTURED['by_tag']:
            IMAGE_STRUCTURED['by_tag'][tag] = []
        IMAGE_STRUCTURED['by_tag'][tag].append(f.name)

# Sort all image data before JSON-ifying it, to keep data consistant. (very usefull when doing diffs between commits)
IMAGE_STRUCTURED = dict(sorted(IMAGE_STRUCTURED.items()))
IMAGE_STRUCTURED['all_images'].sort()
IMAGE_STRUCTURED['by_filename'] = dict(sorted(IMAGE_STRUCTURED['by_filename'].items()))
IMAGE_STRUCTURED['by_rating'] = dict(sorted(IMAGE_STRUCTURED['by_rating'].items()))
IMAGE_STRUCTURED['by_tag'] = dict(sorted(IMAGE_STRUCTURED['by_tag'].items()))
for k,v in IMAGE_STRUCTURED['by_filename'].items():
    IMAGE_STRUCTURED['by_filename'][k] = dict(sorted(v.items()))
for k,v in IMAGE_STRUCTURED['by_rating'].items():
    IMAGE_STRUCTURED['by_rating'][k].sort()
for k,v in IMAGE_STRUCTURED['by_tag'].items():
    IMAGE_STRUCTURED['by_tag'][k].sort()

json_data = json.dumps(IMAGE_STRUCTURED, indent=4, ensure_ascii=False)
with open(DATA['config']['javascript_name'], 'w', encoding='utf-8') as js:
    js.write(f'//THIS FILE IS GENERATED BY "{os.path.basename(__file__)}"\n')
    js.write('"use strict";\n\n')
    js.write(f'const IMAGE_DATA = {json_data}\n')
    js.write('Object.freeze(IMAGE_DATA);\n')
print(f"Data written to {DATA['config']['javascript_name']}\n")

# CREATE THUMBNAILS
thumbnails = Path(IMAGE_STRUCTURED['directory']) / 'thumbnails'
thumbnails.mkdir(parents=True, exist_ok=True)
total,step = len(IMAGE_STRUCTURED['by_filename'].keys()),0
for image, metadata in IMAGE_STRUCTURED['by_filename'].items():
    step += 1
    progress = int(step / total * 100)
    print(f'[{progress}%]\tCreating thumbnail for {image}')
    org_img = Path(IMAGE_STRUCTURED['directory']) / image
    thumbnail = Path(thumbnails) / image

    if thumbnail.is_file(): continue

    # Calculate the thumbnail size
    h = metadata['image_height']
    w = metadata['image_width']
    i = 1
    while ((h > w) * h + (w > h) * w) > DATA['config']['thumbnail_size']: # while the longest side is greater than max length
        h = metadata['image_height'] / i
        w = metadata['image_width'] / i
        i += 1
        if i > 50:
            sys.exit(f'i is {i}, to many iterations.. How big exactly is {image} really?')

    # Runs the shell command, creating the thumbnail.
    try:
        result = subprocess.run(
            ["magick", org_img, '-resize', f'{w}x{h}', str(thumbnail)],
            capture_output=True,
            text=True,
            check=True
        )
    except:
        sys.exit(f'failed to create thumbnail for {image}')
print(f"Thumbnails created in {IMAGE_STRUCTURED['directory']}/{thumbnails.name}\n")

# Show images not included.
if NOT_INCLUDED:
    print(f"Some images in directory '{DATA['config']['image_directory']}' not included!")
    for image in NOT_INCLUDED:
        print(f'Not included: {image}')
else:
    print(f"All images in directory '{DATA['config']['image_directory']}' included!")

print('Complete!')
