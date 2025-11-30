"use strict";

document.addEventListener("DOMContentLoaded", main);
document.title = 'Frifoto - EmilBratt';

const VIEW_MODES = [ 'photo-about', 'photo-navigate', 'photo-lightbox', 'photo-stream', 'photo-slideshow' ];
Object.freeze(VIEW_MODES);
const PROFILE_PICTURE = 'img/2025_10_28__13_57_15__56.jpg';

// Globals for image data
let IMG_DIR, BY_TAG, BY_FILENAME, BY_RATING, ALL_IMAGES

// Helper -> write qid(id).innerHTML instead of document.getElementById(id).innerHTML
const qid = id => document.getElementById(id);

function main() {
    IMG_DIR = IMAGE_DATA['directory'];
    BY_TAG = IMAGE_DATA['by_tag'];
    BY_RATING = IMAGE_DATA['by_rating'];
    BY_FILENAME = IMAGE_DATA['by_filename'];
    ALL_IMAGES = IMAGE_DATA['all_images'];

    const params = new URLSearchParams(document.location.search);
    const view_mode = params.get('view_mode') || 'photo-navigate';
    const tag = params.get('tag') || '';
    const image = params.get('image') || '';
    if (params.has('download')) {
        alert('DOWNLOAD NOT IMPLEMENTED YET');
    }
    switch(view_mode) {
        case 'photo-about':
            init_photo_about();
            break;
        case 'photo-navigate':
            init_photo_directory_navigate();
            break;
        case 'photo-lightbox':
            init_photo_lightbox(tag, image);
            break;
        case 'photo-stream':
            init_photo_stream(tag);
            break;
        case 'photo-slideshow':
            init_photo_slideshow(tag);
            break;
        default:
            init_photo_directory_navigate();
    }
}

function view_mode(id) {
    for (const d of VIEW_MODES) {
        if (d === id) {
            qid(id).style.display = 'block';
        } else {
            qid(d).style.display = 'none';
        }
    }
}

function init_photo_about() {
    qid('photo-about-header').innerHTML = '<h2>Emil Bratt</h2>';
    qid('photo-about-footer').innerHTML = `
        <a class="photo-navigate-btn" href="${window.location.pathname}?view_mode=photo-navigate" method="get">Hovedside</a>
    `;

    qid('photo-about-paragraph').innerHTML = `
        Her vil det komme text om meg.
        Bildet av vårt kjæledyr vil byttes ut med et bilde av meg også. :)
    `;
    qid('photo-about-image').src = PROFILE_PICTURE;
    view_mode('photo-about');

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.querySelector('.photo-navigate-btn').click();
        }
    });
}

function init_photo_directory_navigate() {
    let html = '';
    for (const [tag, images] of Object.entries(BY_TAG)) {
        const random = Math.floor(Math.random() * images.length);
        const img = `${IMG_DIR}/thumbnails/${images[random]}`;
        html += `
        <div class="filterDiv ${tag}">
            <a href="${window.location.pathname}?view_mode=photo-stream&tag=${encodeURIComponent(tag)}" method="get">
                <img src="${img}" loading="lazy" />
            </a>
            <h2>${tag}</h2>
        </div>
        `;
    }

    qid('photo-navigate-header').innerHTML = `
        <a href="${window.location.pathname}?view_mode=photo-about" method="get">Om Meg</a>
        <a href="${window.location.pathname}?view_mode=photo-stream" method="get">Alle Bilder</a>
        <input type="text" id="input_nav_filter" onkeyup="nav_filter_boxes()" autofocus placeholder="Filtrer" title="Type in a name">
    `;
    qid('photo-navigate-boxes').innerHTML = html;
    view_mode('photo-navigate');
}

function init_photo_stream(tag) {
    qid('photo-stream-header').innerHTML = `<h2>${tag}</h2>`;

    let html = '';
    if (tag === '') {
        for (const image of ALL_IMAGES) {
            html += `
                <div>
                    <a href="${window.location.pathname}?view_mode=photo-lightbox&image=${encodeURIComponent(image)}" method="get">
                        <img src="${IMG_DIR}/thumbnails/${image}" loading="lazy" />
                    </a>
                </div>
            `;
        }
    } else {
        for (const image of BY_TAG[tag]) {
            html += `
                <div>
                    <a href="${window.location.pathname}?view_mode=photo-lightbox&tag=${encodeURIComponent(tag)}&image=${encodeURIComponent(image)}" method="get">
                        <img src="${IMG_DIR}/thumbnails/${image}" loading="lazy" />
                    </a>
                </div>
            `;
        }
    }
    qid('photo-stream-boxes').innerHTML = html;
    qid('photo-stream-footer').innerHTML = `
        <a class="photo-navigate-btn" href="${window.location.pathname}?view_mode=photo-navigate" method="get">Hovedside</a>
        <a href="${window.location.pathname}?view_mode=photo-slideshow&tag=${encodeURIComponent(tag)}" method="get">Lysbilde</a>
    `;
    view_mode('photo-stream');

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.querySelector('.photo-navigate-btn').click();
        }
    });
}

function init_photo_lightbox(tag, image) {
    let index, next_index, previous_index, metadata, next_image, previous_image, img_number;

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

    const img = qid('photo-lightbox-img');
    img.src = IMG_DIR + '/' + image;
    img.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            if (img.requestFullscreen) {
                img.requestFullscreen();
            } else if (img.webkitRequestFullscreen) { // Safari
                img.webkitRequestFullscreen();
            }
        }
    });

    qid('photo-lightbox-img-caption').innerHTML = `
        ${img_number}
        - ${metadata['camera']}
        - ${metadata['focal']}
        - ISO ${metadata['ISO']} f${metadata['aperture']} ${metadata['shutter_speed']}
    `;

    qid('photo-lightbox-container-nav-box-buttons').innerHTML = `
        <a class="back-btn" href="${window.location.pathname}?view_mode=photo-stream&tag=${encodeURIComponent(tag)}" method="get">Tilbake</a>
        <a href="${img.src}" download="${image}" type="image/jpg" method="get">Last Ned</a>
        <a class="prev-btn" href="${window.location.pathname}?view_mode=photo-lightbox&tag=${encodeURIComponent(tag)}&image=${encodeURIComponent(previous_image)}" method="get">Forrige</a>
        <a class="next-btn" href="${window.location.pathname}?view_mode=photo-lightbox&tag=${encodeURIComponent(tag)}&image=${encodeURIComponent(next_image)}" method="get">Neste</a>
    `;
    view_mode('photo-lightbox');

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

function init_photo_slideshow(tag) {
    let index = -1;
    const images = [];
    function _apply_next_image() {
        const img_a = qid('photo-slideshow-image-a');
        const img_b = qid('photo-slideshow-image-b');

        const is_visible = img_a.classList.contains('photo-slide-show');
        const img_fade_in = is_visible ? img_a : img_b;
        const img_fade_out  = is_visible ? img_b : img_a;

        index = (index + 1) % images.length;
        img_fade_out.src = images[index];

        // Start the crossfade
        img_fade_in.classList.remove('photo-slide-show');
        img_fade_in.classList.add('photo-slide-hide');

        img_fade_out.classList.add('photo-slide-show');
        img_fade_out.classList.remove('photo-slide-hide');
    }

    const is_random = true; // Hardcode slide-show shuffling of images for now..
    const image_time = 10000;
    const slide_show_container = qid('photo-slideshow-container');

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            window.history.pushState(null, '', `${window.location.pathname}?view_mode=photo-navigate`);
            init_photo_stream(tag)
        }
        else if (event.key === 'f') {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                if (slide_show_container.requestFullscreen) {
                    slide_show_container.requestFullscreen();
                } else if (slide_show_container.webkitRequestFullscreen) { // Safari
                    slide_show_container.webkitRequestFullscreen();
                }
            }
        }
    });
    slide_show_container.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            if (slide_show_container.requestFullscreen) {
                slide_show_container.requestFullscreen();
            } else if (slide_show_container.webkitRequestFullscreen) { // Safari
                slide_show_container.webkitRequestFullscreen();
            }
        }
    });

    if (tag === '') {
        for (const image of ALL_IMAGES) { images.push(IMG_DIR + '/' + image); }
    } else {
        for (const image of BY_TAG[tag]) { images.push(IMG_DIR + '/' + image); }
    }

    if (is_random) {
        for (let i = images.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [images[i], images[j]] = [images[j], images[i]];
        }
    }

    _apply_next_image();
    view_mode('photo-slideshow');
    setInterval(_apply_next_image, image_time);
}

function nav_filter_boxes() {
    let input = qid('input_nav_filter');
    let filter = input.value.toUpperCase();
    let box = qid('photo-navigate-boxes');
    let div = box.getElementsByTagName('div');
    for (let i = 0; i < div.length; i++) {
        if (input.value === '') {
            div[i].style.display = '';
        } else if (div[i].getElementsByTagName('h2')[0].textContent.toUpperCase().replace('%20', ' ').indexOf(filter) > -1) {
            div[i].style.display = '';
        } else {
            div[i].style.display = 'none';
        }
    }
}
