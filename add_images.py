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

import tomllib
from pathlib import Path
from shutil import which
import json
import os
import subprocess

f = open("add_images.toml", "rb")
DATA = tomllib.load(f)
f.close()

IMAGE_STRUCTURED['directory'] = DATA['config']['image_directory']

print(f"Store all images in {DATA['config']['image_directory']} and edit add_images.toml")
# opt = input('Continue [y/N]: ');
# if opt.lower() != 'y': exit()

if which('exiftool') is None:
    exit('"exiftool" is not installed, install with "sudo dnf install exiftool" (fedora)')
if which('magick') is None:
    exit('"magick" is not installed, install with "sudo dnf install magick" (fedora)')

def validate_all_images_exists(images):
    for image in DATA['images']:
        found = False
        for f in images:
            if image == f.name: found = True
        if not found: exit(f"{image} not found in {DATA['config']['image_directory']}")

def extract_exif(rawe):
    exif = {}
    exif['capture_time'] = rawe["DateTimeOriginal"]
    exif['camera'] = rawe['Model']
    if 'LensID' in rawe:
        exif['lens'] = rawe['LensID']
    elif 'LensModel' in rawe:
        exif['lens'] = rawe['LensModel']
    elif 'Lens' in rawe:
        exif['lens'] = rawe['Lens']
    else:
        exit('lens info not found in exif data')
    exif['file_size'] = rawe['FileSize']
    exif['image_width'] = rawe['ImageWidth']
    exif['image_height'] = rawe['ImageHeight']
    exif['shooting_mode'] = rawe['ShootingMode']
    if 'ISO' in rawe:
        exif['ISO'] = rawe['ISO']
    elif 'BaseISO' in rawe:
        exif['ISO'] = rawe['BaseISO']
    else:
        exit('ISO not found in exif data')
    if 'Aperture' in rawe:
        exif['aperture'] = rawe['Aperture']
    elif 'ApertureValue' in rawe:
        exif['aperture'] = rawe['ApertureValue']
    elif 'FNumber' in rawe:
        exif['aperture'] = rawe['FNumber']
    else:
        exit('aperture not found in exif data')
    if 'ExposureTime' in rawe:
        exif['shutter_speed'] = rawe['ExposureTime']
    elif 'ShutterSpeed' in rawe:
        exif['shutter_speed'] = rawe['ShutterSpeed']
    else:
        exit('shutter speed not found in exif data')
    if 'FocalLength' in rawe:
        exif['focal'] = rawe['FocalLength']
    elif 'Lens' in rawe:
        exif['focal'] = rawe['Lens']
    else:
        exit('focal length  not found in exif data')
    return exif

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
        exit(f'failed to read exif data for {f.name}')

    if rawe is None: exit(f'failed to extract exif data for {f.name}')

    IMAGE_STRUCTURED['all_images'].append(f.name)

    IMAGE_STRUCTURED['by_filename'][f.name] = {}
    DATA['images'][f.name]['tags'].sort()

    IMAGE_STRUCTURED['by_filename'][f.name]['tags'] = DATA['images'][f.name]['tags']

    for k,metadata in extract_exif(rawe).items():
        IMAGE_STRUCTURED['by_filename'][f.name][k] = metadata

    rating = DATA['images'][f.name]['rating']
    if rating not in IMAGE_STRUCTURED['by_rating']:
        IMAGE_STRUCTURED['by_rating'][rating] = []
    IMAGE_STRUCTURED['by_rating'][rating].append(f.name)

    for tag in DATA['images'][f.name]['tags']:
        if tag not in IMAGE_STRUCTURED['by_tag']:
            IMAGE_STRUCTURED['by_tag'][tag] = []
        IMAGE_STRUCTURED['by_tag'][tag].append(f.name)

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

json_data = json.dumps(IMAGE_STRUCTURED, indent=4)
with open(DATA['config']['javascript_name'], 'w') as js:
    js.write(f'//THIS FILE IS GENERATED BY "{os.path.basename(__file__)}"\n"use strict";\n\nconst IMAGE_DATA = {json_data}\nObject.freeze(IMAGE_DATA);\n')
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
    h = metadata['image_height'] / 10
    w = metadata['image_width'] / 10
    try:
        result = subprocess.run(
            ["magick", org_img, '-resize', f'{w}x{h}', thumbnail],
            capture_output=True,
            text=True,
            check=True
        )
    except:
        exit(f'failed to create thumbnail for {image}')
print(f"Thumbnails created in {IMAGE_STRUCTURED['directory']}/{thumbnails.name}\n")

# Show images not included.
if NOT_INCLUDED:
    print(f"Some images in directory '{DATA['config']['image_directory']}' not included!")
    for image in NOT_INCLUDED:
        print(f'Not included: {image}')
else:
    print(f"All images in directory '{DATA['config']['image_directory']}' included!")

print('Complete!')