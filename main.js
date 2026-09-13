"use strict";

// Globals
let IMG_DIR, BY_TAG, BY_FILENAME, BY_RATING, ALL_IMAGES, ABOUT, CURRENT_VIEW, IMAGE_INDEX, TAG_INDEX, NEW_IMAGES, NEW_IMAGES_TAG,URL, TAG_TEXT;
NEW_IMAGES_TAG = 'Nye Bilder';
const VIEW_MODES = [ 'photo-about', 'photo-navigate', 'photo-lightbox', 'photo-stream', 'share-page', 'youtube-navigate', ];
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
    TAG_TEXT = DATAMODEL['tag_text'];
    URL = 'https://frifoto.emilbratt.no';
    NEW_IMAGES = [];
    let timeframe = DATAMODEL['new_images_timeframe'];
    const now = parseInt( Date.now()/1000, 10 );  // Unix timestamp in seconds
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

    // Get id for main container and store it in "current_view_mode".
    const query_strings = new URLSearchParams(document.location.search);
    const current_view_mode = query_strings.get('view_mode') || 'photo-navigate';
    const tag = query_strings.get('tag') || '';
    const image = query_strings.get('image') || '';
    switch (current_view_mode) {
        case 'photo-about':
            init_photo_about();
            break;
        case 'photo-navigate':
            init_photo_navigate();
            break;
        case 'photo-lightbox':
            init_photo_lightbox(tag, image);
            break;
        case 'photo-stream':
            init_photo_stream(tag);
            break;
        case 'share-page':
            init_share_page();
            break;
        case 'youtube-navigate':
            init_youtube_navigate();
            break;
        default:
            init_photo_navigate();
    }

    // Disable (hide) all main containers except the "selected" one..
    for (const view_mode of VIEW_MODES) {
        qid(view_mode).style.display = view_mode === current_view_mode ? 'block' : 'none';
    }
}

function init_photo_about() {
    qid('photo-about-header').innerHTML = `<h2>${ABOUT['name']}</h2>`;
    qid('photo-about-footer').innerHTML = `<a class="photo-navigate-btn" href="${window.location.pathname}?view_mode=photo-navigate" method="get">Forside</a>`;
    qid('photo-about-paragraph').innerHTML = ABOUT['bio'];
    qid('photo-about-image').src = `${IMG_DIR}/${ABOUT['image']}`;

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.querySelector('.photo-navigate-btn').click();
        }
    });
}

function init_photo_navigate() {
    // Disable autofocus on mobile (or at least devices with small screens)
    // ..it is bad UX because the keyboard will pop up and consume half the screen :):).
    let autofocus = has_small_screen() ? '' : 'autofocus';

    qid('photo-navigate-header').innerHTML = `
        <a href="${window.location.pathname}?view_mode=photo-about" method="get">Om Meg</a>
        <a href="${window.location.pathname}?view_mode=share-page" method="get">Del nettside</a>
        <a href="${window.location.pathname}?view_mode=youtube-navigate" method="get">Youtube</a>
        <input type="text" id="input_nav_filter" onkeyup="nav_filter_boxes()" ${autofocus} placeholder="Filtrer" title="Søk på nøkkelord">
    `;

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

    qid('photo-navigate-boxes').innerHTML = html;
}

function init_photo_stream(tag) {
    const header = qid('photo-stream-header');
    header.innerHTML = `
        <a class="photo-navigate-btn" href="${location.pathname}?view_mode=photo-navigate">Forside</a>
    `;


    if (TAG_TEXT[tag] !== undefined) {
        header.innerHTML += `
            <button class="photo-navigate-btn" popovertarget="tag-text">Info</button>
            <dialog id="tag-text" popover>
                ${TAG_TEXT[tag]}
	            <!-- <button popovertarget="tag-text" popovertargetaction="hide">Close</button> -->
            </dialog>
        `;
        console.log(TAG_TEXT);
    }

    header.innerHTML += `<h1>${tag}</h1>`;

    const container = qid('photo-stream-boxes');
    container.textContent = '';

    const frag = document.createDocumentFragment();
    const images = tag ===  '' ? ALL_IMAGES
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

    // TODO: PERFORMANCE 001
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

function init_share_page() {
    qid('share-page-header').innerHTML = `<a class="photo-navigate-btn" href="${window.location.pathname}?view_mode=photo-navigate" method="get">Forside</a>`;
    qid('url-qr-code').onclick=() => { navigator.clipboard.writeText(URL) };

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.querySelector('.photo-navigate-btn').click();
        }
    });
}

function init_youtube_navigate() {
    qid('youtube-navigate-header').innerHTML = `<a class="photo-navigate-btn" href="${window.location.pathname}?view_mode=photo-navigate" method="get">Forside</a>`;
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            document.querySelector('.photo-navigate-btn').click();
        }
    });

    let html = '';
    for (const [title, data] of Object.entries(DATAMODEL['youtube'])) {
        html += `
        <div>
            <a target="_blank" href="${data['url']}" method="get">
                <img src="${DATAMODEL['youtube_thumbnails'] + '/' + data['thumbnail']}" loading="lazy" />
            </a>
            <h2>${title}</h2>
        </div>
        `;
    }

    qid('youtube-navigate-boxes').innerHTML = html;
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
