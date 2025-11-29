"use strict";

document.addEventListener("DOMContentLoaded", main);
document.title = 'Frifoto - EmilBratt';

const VIEW_MODES = [ 'photo-about', 'photo-navigate', 'photo-fullscreen', 'photo-stream', 'photo-slideshow' ];
const PROFILE_PICTURE = 'img/2025_10_28__13_57_15__56.jpg';

// Globals for image data
var IMG_DIR, BY_TAG, BY_FILENAME, BY_RATING, ALL_IMAGES

function main() {
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
            init_photo_about();
            break;
        case 'photo-navigate':
            init_photo_directory_navigate();
            break;
        case 'photo-fullscreen':
            if (url.searchParams.has('tag')) {
                init_photo_fullscreen(url.searchParams.get('tag'), url.searchParams.get('image'));
            } else {
                init_photo_fullscreen('', url.searchParams.get('image'));
            }
            break;
        case 'photo-stream':
            if (url.searchParams.has('tag')) {
                init_photo_stream(url.searchParams.get('tag'));
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
    for (const d of VIEW_MODES) {
        if (d == id) {
            document.getElementById(id).style.display = 'block';
        }
        else {
            document.getElementById(d).style.display = 'none';
        }
    }
}

function init_photo_about() {
    document.getElementById('photo-about-header').innerHTML = '<h2>Emil Bratt</h2>';
    document.getElementById('photo-about-footer').innerHTML = `
        <a href="${window.location.pathname}?view_mode=photo-navigate" method="get">Hovedside</a>
    `;

    document.getElementById('photo-about-paragraph').innerHTML = `
        Her vil det komme text om meg.
        Bildet av vårt kjæledyr vil byttes ut med et bilde av meg også. :)
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
        <a class="photo-navigate-btn" href="${window.location.pathname}?view_mode=photo-navigate" method="get">Hovedside</a>
    `;
    // document.getElementById('photo-stream-footer').innerHTML += `
    //     <a href="${window.location.pathname}?view_mode=photo-slideshow" method="get">Lysbildefremviser</a>
    // `;
    view_mode('photo-stream');

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.querySelector('.photo-navigate-btn').click();
        }
    });
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
        <a class="back-btn" href="${window.location.pathname}?view_mode=photo-stream&tag=${tag}" method="get">Tilbake</a>
        <a target="_blank" href="${window.location.pathname}?download=true" method="get"">Last Ned</a>
        <a class="prev-btn" href="${window.location.pathname}?view_mode=photo-fullscreen&tag=${tag}&image=${previous_image}" method="get">Forrige</a>
        <a class="next-btn" href="${window.location.pathname}?view_mode=photo-fullscreen&tag=${tag}&image=${next_image}" method="get">Neste</a>
    `;
    view_mode('photo-fullscreen');

    document.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowRight') {
            document.querySelector('.next-btn').click();
        }
        else if (event.key === 'ArrowLeft') {
            document.querySelector('.prev-btn').click();
        }
        else if (event.key === 'Escape') {
            document.querySelector('.back-btn').click();
        }
    });
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
