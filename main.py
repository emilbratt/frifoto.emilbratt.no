#!/usr/bin/env python3

import tomllib
from datetime import datetime, timezone
from pathlib import Path
from shutil import which
import json
import os
import re
import subprocess
import sys
import time

SCRIPT_TIMESTAMP = int(time.time())
METADATA_REQUIRES = [
    'capture_time', 'camera', 'lens', 'file_size', 'image_width', 'image_height',
    'shooting_mode', 'ISO', 'aperture', 'shutter_speed', 'focal', 'added', 'tags',
]
SCRIPT = 'datamodel.js'

# After processing, this will hold all the structured information we need. All fields are sorted before generating datamodel..
DATAMODEL_LAYOUT = {
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

    'by_added': {
        # 1762536703: [img0, img1], 1769536703: [img1, img2]..
    },

    'about': {
        # name: string, bio: string
    },

    'directory': None, # path to images
    'new_images_timeframe': None,
    'generated': None,
}

def rounded_timestamp(ts) -> int:
    '''Round timestamp to a full day (neat for when adding photos in multiple batches in one day)'''
    return int(
        datetime.fromtimestamp(ts, tz=timezone.utc)
        .replace(hour=0, minute=0, second=0, microsecond=0)
        .timestamp()
    )

def fmt_timestamp(ts) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S%z")


def get_current_datamodel(f) -> dict|None:
    '''Try loading current JavaScript datamodel so that we can skip re-extractring EXIF etc.'''
    try:
        js_text = Path(f).read_text(encoding="utf-8")
        # Extract the object assigned to DATAMODEL
        match = re.search(r'const\s+DATAMODEL\s*=\s*(\{.*\})\s*Object\.freeze',
                        js_text,
                        re.DOTALL)
        if not match:
            raise ValueError("Could not find DATAMODEL object")
        json_text = match.group(1)
        data = json.loads(json_text)

        # JSON objects can only have strings as json keys, bring the rating keys back to integers
        data['by_rating'] = {int(k): v for k, v in data['by_rating'].items()}
        return data
    except:
        return None

# List all images found in the image directory.

CURRENT_DATAMODEL = get_current_datamodel(SCRIPT)
if CURRENT_DATAMODEL is None:
    CURRENT_DATAMODEL = DATAMODEL_LAYOUT
NOT_INCLUDED = []
CONFIG_FILE = 'admin.toml'

# Some exif metadata is incorrect, fix by having it map to the correct data..
EXIF_FIX = {
    # 'wrong value': correct value',..
    'Sigma 50mm f/1.4 DG HSM | A or Zeiss Milvus 50mm f/1.4 or Sigma 50mm f/1.5 FF High-Speed Prime | 017 or Tokina Opera 50mm f/1.4 FF': 'Sigma 50mm f/1.4 DG HSM',
    'Sigma 35mm f/1.4 DG HSM or Sigma 35mm f/1.5 FF High-Speed Prime | 017': 'Sigma 35mm f/1.4 DG HSM',
    'Sigma 20mm f/1.4 DG HSM | A': 'Sigma 20mm f/1.4 DG HSM'
}

f = open(CONFIG_FILE, "rb")
DATA = tomllib.load(f)
f.close()

NEW_DATAMODEL = DATAMODEL_LAYOUT
NEW_DATAMODEL['directory'] = DATA['config']['image_directory']
NEW_DATAMODEL['about']['name'] = f'{DATA['about']['name']}'
NEW_DATAMODEL['about']['bio'] = ''.join([f'<p>{s}</p>' for s in DATA['about']['bio'].split('\n\n')])
NEW_DATAMODEL['new_images_timeframe'] = int(DATA['config']['new_images_timeframe'])

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

def get_exif(rawe, key_list) -> str|int|None :
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
    meta = None
    try:
        meta = CURRENT_DATAMODEL['by_filename'][f.name]
        print(f'[{progress}%]\tReading exif for {f} from current datamodel')
    except:
        print(f'[{progress}%]\tReading exif for {f} with exiftool')
        # no current metadata available, lets generate it..
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
        meta = {
            'added': rounded_timestamp(os.path.getmtime(f)),
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

    # might have added new tags, lets do this wether meta already existed or not..
    DATA['images'][f.name]['tags'].sort()
    meta['tags'] = DATA['images'][f.name]['tags']

    for key in METADATA_REQUIRES:
        if key not in meta.keys():
            sys.exit(f"ERRIR: meta or exif key '{key}' not found for image: {f.name}")
    for key,data in meta.items():
        if data == None:
            sys.exit(f"ERRIR: meta or exif data for '{key}' is not found for image: {f.name}")

    NEW_DATAMODEL['all_images'].append(f.name)
    NEW_DATAMODEL['by_filename'][f.name] = meta

    rating = DATA['images'][f.name].get('rating', -1) # '-1' just means that rating is not specified..
    if rating not in NEW_DATAMODEL['by_rating']:
        NEW_DATAMODEL['by_rating'][rating] = []
    NEW_DATAMODEL['by_rating'][rating].append(f.name)

    for tag in DATA['images'][f.name]['tags']:
        if tag not in NEW_DATAMODEL['by_tag']:
            NEW_DATAMODEL['by_tag'][tag] = []
        NEW_DATAMODEL['by_tag'][tag].append(f.name)

    if meta['added'] not in NEW_DATAMODEL['by_added']:
        NEW_DATAMODEL['by_added'][meta['added']] = []
    NEW_DATAMODEL['by_added'][meta['added']].append(f.name)

NEW_DATAMODEL['generated'] = fmt_timestamp(int(time.time()))

# CREATE THUMBNAILS
quality = str(DATA['config']['thumbnail_quality'])
thumbnails = Path(NEW_DATAMODEL['directory']) / 'thumbnails'
thumbnails.mkdir(parents=True, exist_ok=True)
total,step = len(NEW_DATAMODEL['by_filename'].keys()),0
for image, metadata in NEW_DATAMODEL['by_filename'].items():
    step += 1
    progress = int(step / total * 100)
    org_img = Path(NEW_DATAMODEL['directory']) / image
    thumbnail = Path(thumbnails) / image
    if thumbnail.is_file():
        print(f'[{progress}%]\tThumbnail for {image} exists')
        continue
    else:
        print(f'[{progress}%]\tCreating thumbnail for {image}')

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
    except:
        sys.exit(f'failed to create thumbnail for {image}')


print(f"Thumbnails created in {NEW_DATAMODEL['directory']}/{thumbnails.name}\n")

# Sort all image data before JSON-ifying it, to keep data consistant. (very usefull when doing diffs between commits)
NEW_DATAMODEL = dict(sorted(NEW_DATAMODEL.items()))
NEW_DATAMODEL['all_images'].sort()

NEW_DATAMODEL['by_added'] = dict(sorted(NEW_DATAMODEL['by_added'].items()))
for k,v in NEW_DATAMODEL['by_added'].items():
    NEW_DATAMODEL['by_added'][k].sort()

NEW_DATAMODEL['by_filename'] = dict(sorted(NEW_DATAMODEL['by_filename'].items()))
for k,v in NEW_DATAMODEL['by_filename'].items():
    NEW_DATAMODEL['by_filename'][k] = dict(sorted(v.items()))

NEW_DATAMODEL['by_rating'] = dict(sorted(NEW_DATAMODEL['by_rating'].items()))
for k,v in NEW_DATAMODEL['by_rating'].items():
    NEW_DATAMODEL['by_rating'][k].sort()

NEW_DATAMODEL['by_tag'] = dict(sorted(NEW_DATAMODEL['by_tag'].items()))
for k,v in NEW_DATAMODEL['by_tag'].items():
    NEW_DATAMODEL['by_tag'][k].sort()

# Write final javascript JSON object file..
json_data = json.dumps(NEW_DATAMODEL, indent=4, ensure_ascii=False)
with open(SCRIPT, 'w', encoding='utf-8') as js:
    js.write(f'//THIS FILE IS GENERATED BY "{os.path.basename(__file__)}"\n')
    js.write('"use strict";\n\n')
    js.write(f'const DATAMODEL = {json_data}\n')
    js.write('Object.freeze(DATAMODEL);\n')
print(f"Data written to {SCRIPT}\n")

# Show images not included.
if NOT_INCLUDED:
    print(f"Some images in directory '{DATA['config']['image_directory']}' was not included!")
    for image in NOT_INCLUDED:
        print(f'Not included: {image}')
else:
    print(f"All images in directory '{DATA['config']['image_directory']}' included!")

print('Complete!')
