"use strict";

document.addEventListener("DOMContentLoaded", main);
document.title = 'Frifoto - EmilBratt';

const MAIN_CONTAINERS = [ 'photo-about', 'photo-navigate', 'photo-fullscreen', 'photo-stream', 'photo-slideshow' ];
const PROFILE_PICTURE = 'img/2025_10_28__13_57_15__56.jpg';

// Globals for image data
var IMG_DIR, BY_TAG, BY_FILENAME, BY_RATING, ALL_IMAGES

function main() {
    if (false) { throw new Error('main() -> if block is false..'); }

    IMG_DIR = IMAGE_DATA['directory'];
    BY_TAG = IMAGE_DATA['by_tag'];
    BY_RATING = IMAGE_DATA['by_rating'];
    BY_FILENAME = IMAGE_DATA['by_filename'];
    ALL_IMAGES = IMAGE_DATA['all_images'];

    const url = new URL(window.location.href);

    if (url.searchParams.has('download')) { alert('DOWNLOAD NOT IMPLEMENTED YET'); }

    if (!url.searchParams.has('view_mode')) {
        init_photo_directory_navigate();
    } else {
        let view_mode = url.searchParams.get('view_mode');
        switch(view_mode) {
        case 'photo-about':
            init_photo_frontpage();
            break;
        case 'photo-navigate':
            init_photo_directory_navigate();
            break;
        case 'photo-fullscreen':
            if (url.searchParams.has('tag')) {
                init_photo_fullscreen(url.searchParams.get("tag"), url.searchParams.get("image"));
            } else {
                init_photo_fullscreen('', url.searchParams.get("image"));
            }
            break;
        case 'photo-stream':
            if (url.searchParams.has('tag')) {
                init_photo_stream(url.searchParams.get("tag"));
            } else {
                init_photo_stream('');
            }
            break;
        case 'photo-slideshow':
            init_photo_slideshow();
            break;
        default:
            init_photo_directory_navigate();
        } 
    }
}

function view_mode(id) {
    for (const d of MAIN_CONTAINERS) { document.getElementById(d).style.display = 'none'; }
    document.getElementById(id).style.display = 'block';
}

function init_photo_frontpage() {
    document.getElementById('photo-about-header').innerHTML = '<h2>Emil Bratt</h2>';
    document.getElementById('photo-about-footer').innerHTML = `
        <a href="${window.location.pathname}?view_mode=photo-navigate" method="get">Bilder</a>
    `;

    document.getElementById('photo-about-paragraph').innerHTML = `
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
    `;
    document.getElementById('photo-about-image').src = PROFILE_PICTURE;
    view_mode('photo-about');
}

function init_photo_directory_navigate() {
    let html = '';
    for (const [tag, images] of Object.entries(BY_TAG)) {
        const min = 0;
        const max = images.length-1;
        const random = Math.floor(Math.random() * (max - min + 1)) + min;
        const img = `${IMG_DIR}/thumbnails/${images[random]}`;
        html += `
        <div class="filterDiv ${tag}">
            <a href="${window.location.pathname}?view_mode=photo-stream&tag=${tag}" method="get">
                <img src="${img}" loading="lazy" />
            </a>
            <h2>${tag}</h2>
        </div>
        `;
    }

    document.getElementById('photo-navigate-header').innerHTML = `
        <a href="${window.location.pathname}?view_mode=photo-about" method="get">Om Meg</a>
        <a href="${window.location.pathname}?view_mode=photo-stream" method="get">Alle Bilder</a>
        <input type="text" id="input_nav_filter" onkeyup="nav_filter_boxes()" autofocus placeholder="Filtrer" title="Type in a name">
    `;
    document.getElementById('photo-navigate-boxes').innerHTML = html;
    view_mode('photo-navigate');
}

function init_photo_stream(tag) {
    document.getElementById('photo-stream-header').innerHTML = `<h2>${tag}</h2>`;
    console.log('tag', tag);
    let html = '';
    if (tag === '') {
        for (const image of ALL_IMAGES) {
            html += `
                <div>
                    <a href="${window.location.pathname}?view_mode=photo-fullscreen&image=${image}" method="get">
                        <img src="${IMG_DIR}/thumbnails/${image}" loading="lazy" />
                    </a>
                </div>
            `;

        }
    } else {
        for (const image of BY_TAG[tag]) {
            html += `
                <div>
                    <a href="${window.location.pathname}?view_mode=photo-fullscreen&tag=${tag}&image=${image}" method="get">
                        <img src="${IMG_DIR}/thumbnails/${image}" loading="lazy" />
                    </a>
                </div>
            `;
        }
    }
    document.getElementById('photo-stream-boxes').innerHTML = html;

    document.getElementById('photo-stream-footer').innerHTML = `
    <a href="${window.location.pathname}?view_mode=photo-navigate" method="get">Tilbake</a>
    <a href="${window.location.pathname}?view_mode=photo-slideshow" method="get">Lysbildefremviser</a>
    `;
    view_mode('photo-stream');
}

function init_photo_fullscreen(tag, image) {
    var index, next_index, previous_index, metadata, next_image, previous_image, img_number;

    if (tag === '') {
        index = ALL_IMAGES.indexOf(image);
        next_index = index === ALL_IMAGES.length-1 ? 0 : index+1;
        previous_index = index === 0 ? ALL_IMAGES.length-1 : index-1;
        metadata = BY_FILENAME[image];
        next_image = ALL_IMAGES[next_index];
        previous_image = ALL_IMAGES[previous_index];
        img_number = `${index+1}/${ALL_IMAGES.length}`;
    } else {
        index = BY_TAG[tag].indexOf(image);
        next_index = index === BY_TAG[tag].length-1 ? 0 : index+1;
        previous_index = index === 0 ? BY_TAG[tag].length-1 : index-1;
        metadata = BY_FILENAME[image];
        next_image = BY_TAG[tag][next_index];
        previous_image = BY_TAG[tag][previous_index];
        img_number = `${index+1}/${BY_TAG[tag].length}`;
    }
    document.getElementById('photo-fullscreen-img').src = IMG_DIR + '/' + image;
    document.getElementById('photo-fullscreen-img-caption').innerHTML = `
        ${img_number}
        - ${metadata['camera']}
        - ${metadata['focal']}
        - ISO ${metadata['ISO']} f${metadata['aperture']} ${metadata['shutter_speed']}
    `;

    document.getElementById('photo-fullscreen-container-nav-box-buttons').innerHTML = `
        <a href="${window.location.pathname}?view_mode=photo-stream&tag=${tag}" method="get">Tilbake</a>
        <a target="_blank" href="${window.location.pathname}?download=true" method="get"">Last Ned</a>
        <a href="${window.location.pathname}?view_mode=photo-fullscreen&tag=${tag}&image=${previous_image}" method="get">Forrige</a>
        <a href="${window.location.pathname}?view_mode=photo-fullscreen&tag=${tag}&image=${next_image}" method="get">Neste</a>
    `;
    view_mode('photo-fullscreen');
}

function init_photo_slideshow() {
    alert('PHOTO SLIDESHOW NOT IMPLEMENTED YET');
    init_photo_directory_navigate();
}

function nav_filter_boxes() {
    let input = document.getElementById('input_nav_filter');
    let filter = input.value.toUpperCase();
    let box = document.getElementById('photo-navigate-boxes');
    let div = box.getElementsByTagName('div');
    for (let i = 0; i < div.length; i++) {
        if (input.value === '') {
            div[i].style.display = '';
        }
        else if (div[i].getElementsByTagName('h2')[0].textContent.toUpperCase().replace('%20', ' ').indexOf(filter) > -1) {
            div[i].style.display = '';
        } else {
            div[i].style.display = 'none';
        }
    }
}
