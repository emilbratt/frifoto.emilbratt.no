"use strict";

// Globals
let IMG_DIR, BY_TAG, BY_FILENAME, BY_RATING, ALL_IMAGES, ABOUT, CURRENT_VIEW, IMAGE_INDEX, TAG_INDEX, SLIDE_RANDOM;
SLIDE_RANDOM = true;
const VIEW_MODES = [ 'photo-about', 'photo-navigate', 'photo-lightbox', 'photo-stream', 'photo-slideshow' ];
Object.freeze(VIEW_MODES);

document.addEventListener("DOMContentLoaded", main);
document.title = 'Frifoto - EmilBratt';

document.addEventListener('keydown', (event) => {
    switch (CURRENT_VIEW) {
        case 'photo-about':
        case 'photo-stream':
            if (event.key === 'Escape') {
                document.querySelector('.photo-navigate-btn')?.click();
            }
            break;

        case 'photo-lightbox':
            if (event.key === 'ArrowRight') {
                document.querySelector('.next-btn')?.click();
            } else if (event.key === 'ArrowLeft') {
                document.querySelector('.prev-btn')?.click();
            } else if (event.key === 'Escape') {
                document.querySelector('.back-btn')?.click();
            }
            break;
    }
});

const PROFILE_PICTURE = 'img/2025_10_28__13_57_15__56.jpg';

// Helper -> write qid(id).innerHTML instead of document.getElementById(id).innerHTML
const qid = id => document.getElementById(id);

function main() {
    IMG_DIR = IMAGE_DATA['directory'];
    BY_TAG = IMAGE_DATA['by_tag'];
    BY_RATING = IMAGE_DATA['by_rating'];
    BY_FILENAME = IMAGE_DATA['by_filename'];
    ALL_IMAGES = IMAGE_DATA['all_images'];
    ABOUT = IMAGE_DATA['about'];

    // TODO: PERFORMANCE 001
    // If we decide to not reload page on every button click in lightbox view mode, this will increase performance.
    // // Create indexes for images e.g. map an image (for example 123.jpg) to specific index for fast lookup..
    // IMAGE_INDEX = Object.create(null);
    // ALL_IMAGES.forEach((img, i) => IMAGE_INDEX[img] = i);
    // TAG_INDEX = {};
    // for (const tag in BY_TAG) {
    //     TAG_INDEX[tag] = Object.fromEntries(
    //         BY_TAG[tag].map((img, i) => [img, i])
    //     );
    // }

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
    CURRENT_VIEW = id;
    for (const d of VIEW_MODES) {
        qid(d).style.display = d === id ? 'block' : 'none';
    }
}

function init_photo_about() {
    qid('photo-about-header').innerHTML = `<h2>${ABOUT['name']}</h2>`;
    qid('photo-about-footer').innerHTML = `<a class="photo-navigate-btn" href="${window.location.pathname}?view_mode=photo-navigate" method="get">Forside</a>`;
    qid('photo-about-paragraph').innerHTML = ABOUT['bio'];
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
    const header = qid('photo-stream-header');
    header.innerHTML = `
        <a class="photo-navigate-btn" href="${location.pathname}?view_mode=photo-navigate">Forside</a>
        <h1>${tag}</h1>
        <a href="${location.pathname}?view_mode=photo-slideshow&tag=${encodeURIComponent(tag)}">Lysbilde</a>
    `;

    const container = qid('photo-stream-boxes');
    container.textContent = '';

    const frag = document.createDocumentFragment();
    const images = tag === '' ? ALL_IMAGES : BY_TAG[tag];
    const tag_query = tag === '' ? '' : `tag=${encodeURIComponent(tag)}`;

    for (const image of images) {
        const div = document.createElement('div');
        const a = document.createElement('a');
        const img = document.createElement('img');

        a.href = `${location.pathname}?view_mode=photo-lightbox&${tag_query}&image=${encodeURIComponent(image)}`;
        img.src = `${IMG_DIR}/thumbnails/${image}`;
        img.loading = 'lazy';

        a.appendChild(img);
        div.appendChild(a);
        frag.appendChild(div);
    }

    container.appendChild(frag);
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
        // TODO: PERFORMANCE 001
        // If we decide to not reload page on every button click in lightbox view mode, this will increase performance.
        // index = IMAGE_INDEX[image];
        index = ALL_IMAGES.indexOf(image);
        next_index = index === ALL_IMAGES.length-1 ? 0 : index+1;
        previous_index = index === 0 ? ALL_IMAGES.length-1 : index-1;
        metadata = BY_FILENAME[image];
        next_image = ALL_IMAGES[next_index];
        previous_image = ALL_IMAGES[previous_index];
        img_number = `${index+1}/${ALL_IMAGES.length}`;
    } else {
        // TODO: PERFORMANCE 001
        // If we decide to not reload page on every button click in lightbox view mode, this will increase performance.
        // index = TAG_INDEX[tag][image];
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

    let date = new Date(metadata['capture_time']
        .replace(/^(\d+):(\d+):(\d+)/, "$1-$2-$3")
        .replace(" ", "T"))
        .toLocaleString("no-NO", { timeZone: "UTC" })
        .split(',')[0];
    qid('photo-lightbox-img-caption').innerHTML = `
        ${img_number}
        - ${metadata['camera']}
        - ${metadata['focal']}
        - ISO ${metadata['ISO']} f${metadata['aperture']} ${metadata['shutter_speed']}s
        - ${date}
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
        } else if (event.key === 'ArrowLeft') {
            document.querySelector('.prev-btn').click();
        } else if (event.key === 'Escape') {
            document.querySelector('.back-btn').click();
        }
    });
}

function init_photo_slideshow(tag) {
    view_mode('photo-slideshow');
    const container = qid('photo-slideshow-container');
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            window.history.pushState(null, '', `${window.location.pathname}?view_mode=photo-navigate`);
            init_photo_stream(tag)
        } else if (event.key === 'f') {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                } else if (container.webkitRequestFullscreen) { // Safari
                    container.webkitRequestFullscreen();
                }
            }
        }
    });
    container.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) { // Safari
                container.webkitRequestFullscreen();
            }
        }
    });

    const images = [];
    if (tag === '') {
        for (const image of ALL_IMAGES) { images.push(IMG_DIR + '/' + image); }
    } else {
        for (const image of BY_TAG[tag]) { images.push(IMG_DIR + '/' + image); }
    }
    if (SLIDE_RANDOM) {
        for (let i = images.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [images[i], images[j]] = [images[j], images[i]];
        }
    }

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.src = images[i];
        if (i === 0) {
            img.className = 'active';
        }
        img.loading = 'lazy';
        fragment.appendChild(img);
    }
    container.appendChild(fragment);

    let index = 0;
    setInterval(
        () => {
            container.children[index].classList.remove('active');
            index = (index + 1) % container.children.length;
            container.children[index].classList.add('active');
        },
        8000
    );
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
