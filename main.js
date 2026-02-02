"use strict";

// Globals
let IMG_DIR, BY_TAG, BY_FILENAME, BY_RATING, ALL_IMAGES, ABOUT, CURRENT_VIEW, IMAGE_INDEX, TAG_INDEX, SLIDE_RANDOM, NEW_IMAGES, NEW_IMAGES_TAG;
SLIDE_RANDOM = true;
NEW_IMAGES_TAG = 'Nye Bilder';
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

// Beware of saturating the main function with new logic, as it is called on every page load..
function main() {
    IMG_DIR = DATAMODEL['directory'];
    BY_TAG = DATAMODEL['by_tag'];
    BY_RATING = DATAMODEL['by_rating'];
    BY_FILENAME = DATAMODEL['by_filename'];
    ALL_IMAGES = DATAMODEL['all_images'];
    ABOUT = DATAMODEL['about'];

    let timeframe = DATAMODEL['new_images_timeframe'];
    const now = parseInt( Date.now()/1000, 10 );  // Unix timestamp in seconds
    NEW_IMAGES = [];
    // Should we show new images?
    for (const [ts, images] of Object.entries(DATAMODEL['by_added'])) {
        if (now - ts < timeframe) {
            NEW_IMAGES = NEW_IMAGES.concat(images);
        }
    }

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

    const random = Math.floor(Math.random() * ALL_IMAGES.length);
    const img = `${IMG_DIR}/thumbnails/${ALL_IMAGES[random]}`;
    html += `
    <div>
        <a href="${window.location.pathname}?view_mode=photo-stream" method="get">
            <img src="${img}" loading="lazy" />
        </a>
        <h2>Alle Bilder</h2>
    </div>
    `;

    if (NEW_IMAGES.length > 0) {
        const random = Math.floor(Math.random() * NEW_IMAGES.length);
        const img = `${IMG_DIR}/thumbnails/${NEW_IMAGES[random]}`;
        html += `
        <div>
            <a href="${window.location.pathname}?view_mode=photo-stream&tag=${encodeURIComponent(NEW_IMAGES_TAG)}" method="get">
                <img src="${img}" loading="lazy" />
            </a>
            <h2>${NEW_IMAGES_TAG}</h2>
        </div>
        `;
    }
    for (const [tag, images] of Object.entries(BY_TAG)) {
        const random = Math.floor(Math.random() * images.length);
        const img = `${IMG_DIR}/thumbnails/${images[random]}`;
        html += `
        <div>
            <a href="${window.location.pathname}?view_mode=photo-stream&tag=${encodeURIComponent(tag)}" method="get">
                <img src="${img}" loading="lazy" />
            </a>
            <h2>${tag}</h2>
        </div>
        `;
    }

    // Disable autofocus on mobile (or at least devices with small screens)
    // ..it is bad UX because the keyboard will pop up and consume half the screen :):).
    let autofocus = has_small_screen() ? '' : 'autofocus';

    qid('photo-navigate-header').innerHTML = `
        <a href="${window.location.pathname}?view_mode=photo-about" method="get">Om Meg</a>
        <input type="text" id="input_nav_filter" onkeyup="nav_filter_boxes()" ${autofocus} placeholder="Filtrer" title="Søk på nøkkelord">
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
    const images
        = tag ===  '' ? ALL_IMAGES
        : tag === NEW_IMAGES_TAG ? NEW_IMAGES
        : BY_TAG[tag];

    const tag_query = tag === '' ? '' : `&tag=${encodeURIComponent(tag)}`;
    for (const image of images) {
        const div = document.createElement('div');
        const a = document.createElement('a');
        const img = document.createElement('img');

        a.href = `${location.pathname}?view_mode=photo-lightbox${tag_query}&image=${encodeURIComponent(image)}`;
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
    const images
        = tag === NEW_IMAGES_TAG ? NEW_IMAGES
        : tag === '' ? ALL_IMAGES
        : BY_TAG[tag];

    // TODO: PERFORMANCE 001n
    // If we decide to not reload page on every button click in lightbox view mode, this will increase performance.
    // index = IMAGE_INDEX[image];
    const index = images.indexOf(image);
    const next_index = index === images.length-1 ? 0 : index+1;
    const previous_index = index === 0 ? images.length-1 : index-1;
    const metadata = BY_FILENAME[image];
    const next_image = images[next_index];
    const previous_image = images[previous_index];
    const img_number = `${index+1} av ${images.length}`;
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
        Bilde: ${img_number} dato. ${date}<br>
        ${metadata['camera']} & ${metadata['lens']} - ${metadata['shutter_speed']}s f${metadata['aperture']} ISO ${metadata['ISO']} @ ${metadata['focal']}
    `;
    const tag_query = tag === '' ? '' : `&tag=${encodeURIComponent(tag)}`;
    qid('photo-lightbox-container-nav-box-buttons').innerHTML = `
        <a class="back-btn" href="${window.location.pathname}?view_mode=photo-stream${tag_query}" method="get">Tilbake</a>
        <a href="${img.src}" download="${image}" type="image/jpg" method="get">Last Ned</a>
        <a class="prev-btn" href="${window.location.pathname}?view_mode=photo-lightbox${tag_query}&image=${encodeURIComponent(previous_image)}" method="get">Forrige</a>
        <a class="next-btn" href="${window.location.pathname}?view_mode=photo-lightbox${tag_query}&image=${encodeURIComponent(next_image)}" method="get">Neste</a>
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

// only for use when
function has_small_screen() {
    // first, quick dirty check..

    // consider it handhield
    if (window.innerWidth <= 600) return true;
    if (window.innerHeight <= 600) return true;

    return false;
}

// functions not in use for now
//
// currently we use has_small_screen as it works for our use case.
// function __is_handhield() {
//     const devices = [
//         /Android/i,
//         /webOS/i,
//         /iPhone/i,
//         /iPad/i,
//         /iPod/i,
//         /BlackBerry/i,
//         /Windows Phone/i
//     ];

//     return devices.some((toMatchItem) => {
//         return navigator.userAgent.match(toMatchItem);
//     });
// }
