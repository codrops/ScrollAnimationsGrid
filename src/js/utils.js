const imagesLoaded = require('imagesloaded');

const lerp = (a, b, n) => (1 - n) * a + n * b;

/**
 * Preload images
 * @param {String} selector - Selector/scope from where images need to be preloaded. Default is 'img'
 */
const preloadImages = (selector = 'img') => {
    return new Promise((resolve) => {
        imagesLoaded(document.querySelectorAll(selector), {background: true}, resolve);
    });
};

export {
    lerp,
    preloadImages
};