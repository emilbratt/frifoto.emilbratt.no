#!/usr/bin/env python3

# After processing, this will hold all the structured information we need
DATAMODEL = {
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

    # images not found in the thumbnail directory before adding are considered new
    'new_images': [
        # [img0, img1,.. ]
    ],

    'directory': {
        # path to images
    },

    'about': {
        # name: string, bio: string
    },

    # Save timestamp for when new images was last added.
    # Is used when for example, if you want to omit displaying "new added images" after a week etc..
    'new_images_at': 0,
    'new_images_timeframe': None,
}
# List all images found in the image directory.
NOT_INCLUDED = []
CONFIG_FILE = 'admin.toml'
NEW_IMAGES_ADDED = False

# Some exif metadata is incorrect, fix by having it map to the correct data..
EXIF_FIX = {
    # 'wrong value': correct value',..
    'Sigma 50mm f/1.4 DG HSM | A or Zeiss Milvus 50mm f/1.4 or Sigma 50mm f/1.5 FF High-Speed Prime | 017 or Tokina Opera 50mm f/1.4 FF': 'Sigma 50mm f/1.4 DG HSM',
    'Sigma 35mm f/1.4 DG HSM or Sigma 35mm f/1.5 FF High-Speed Prime | 017': 'Sigma 35mm f/1.4 DG HSM',
    'Sigma 20mm f/1.4 DG HSM | A': 'Sigma 20mm f/1.4 DG HSM'
}

import tomllib
from pathlib import Path
from shutil import which
import json
import os
import subprocess
import sys
import time

f = open(CONFIG_FILE, "rb")
DATA = tomllib.load(f)
f.close()

DATAMODEL['directory'] = DATA['config']['image_directory']
DATAMODEL['about']['name'] = f'{DATA['about']['name']}'
DATAMODEL['about']['bio'] = ''.join([f'<p>{s}</p>' for s in DATA['about']['bio'].split('\n\n')])
DATAMODEL['new_images_timeframe'] = int(DATA['config']['new_images_timeframe'])

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
            return EXIF_FIX.get(rawe[key], rawe[key])
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

    DATAMODEL['all_images'].append(f.name)

    DATAMODEL['by_filename'][f.name] = {}
    DATA['images'][f.name]['tags'].sort()

    DATAMODEL['by_filename'][f.name]['tags'] = DATA['images'][f.name]['tags']

    for k,metadata in exif.items():
        DATAMODEL['by_filename'][f.name][k] = metadata

    rating = DATA['images'][f.name].get('rating', -1) # '-1' just means that rating is not specified..
    if rating not in DATAMODEL['by_rating']:
        DATAMODEL['by_rating'][rating] = []
    DATAMODEL['by_rating'][rating].append(f.name)

    for tag in DATA['images'][f.name]['tags']:
        if tag not in DATAMODEL['by_tag']:
            DATAMODEL['by_tag'][tag] = []
        DATAMODEL['by_tag'][tag].append(f.name)

# CREATE THUMBNAILS
quality = str(DATA['config']['thumbnail_quality'])
thumbnails = Path(DATAMODEL['directory']) / 'thumbnails'
thumbnails.mkdir(parents=True, exist_ok=True)
total,step = len(DATAMODEL['by_filename'].keys()),0
for image, metadata in DATAMODEL['by_filename'].items():
    step += 1
    progress = int(step / total * 100)
    org_img = Path(DATAMODEL['directory']) / image
    thumbnail = Path(thumbnails) / image
    if thumbnail.is_file(): continue
    print(f'[{progress}%]\tCreating thumbnail for {image}')
    NEW_IMAGES_ADDED = True

    # Calculate the thumbnail size
    h = metadata['image_height']
    w = metadata['image_width']
    i = 1
    while ((h >= w) * h + (w > h) * w) > DATA['config']['thumbnail_size']: # while the longest side is greater than thumbnail_size in admin.toml
        h = metadata['image_height'] / i
        w = metadata['image_width'] / i
        i += 1
        if i > 50:
            sys.exit(f'Error: resize failed, i is {i}, too many iterations, how big exactly is {image} really?')

    # Runs the shell command, creating the thumbnail.
    try:
        # create thumbnail
        subprocess.run(
            ["magick", org_img, '-resize', f'{w}x{h}', '-format', 'jpeg', '-quality', quality, str(thumbnail)],
            capture_output=True,
            text=True,
            check=True
        )

        # strip metadata
        subprocess.run(
            ["exiftool", str(thumbnail), '-all=', '-overwrite_original', ],
            capture_output=True,
            text=True,
            check=True
        )
        DATAMODEL['new_images'].append(image)
    except:
        sys.exit(f'failed to create thumbnail for {image}')


print(f"Thumbnails created in {DATAMODEL['directory']}/{thumbnails.name}\n")

# Sort all image data before JSON-ifying it, to keep data consistant. (very usefull when doing diffs between commits)
DATAMODEL = dict(sorted(DATAMODEL.items()))
DATAMODEL['all_images'].sort()
DATAMODEL['new_images'].sort()

DATAMODEL['by_filename'] = dict(sorted(DATAMODEL['by_filename'].items()))
for k,v in DATAMODEL['by_filename'].items():
    DATAMODEL['by_filename'][k] = dict(sorted(v.items()))

DATAMODEL['by_rating'] = dict(sorted(DATAMODEL['by_rating'].items()))
for k,v in DATAMODEL['by_rating'].items():
    DATAMODEL['by_rating'][k].sort()

DATAMODEL['by_tag'] = dict(sorted(DATAMODEL['by_tag'].items()))
for k,v in DATAMODEL['by_tag'].items():
    DATAMODEL['by_tag'][k].sort()

if NEW_IMAGES_ADDED:
    DATAMODEL['new_images_at'] = int(time.time())

# Write final javascript JSON object file..
json_data = json.dumps(DATAMODEL, indent=4, ensure_ascii=False)
with open(DATA['config']['javascript_name'], 'w', encoding='utf-8') as js:
    js.write(f'//THIS FILE IS GENERATED BY "{os.path.basename(__file__)}"\n')
    js.write('"use strict";\n\n')
    js.write(f'const DATAMODEL = {json_data}\n')
    js.write('Object.freeze(DATAMODEL);\n')
print(f"Data written to {DATA['config']['javascript_name']}\n")

# Show images not included.
if NOT_INCLUDED:
    print(f"Some images in directory '{DATA['config']['image_directory']}' was not included!")
    for image in NOT_INCLUDED:
        print(f'Not included: {image}')
else:
    print(f"All images in directory '{DATA['config']['image_directory']}' included!")

print('Complete!')
