/**
 * Preload images (for background images, the URL is loaded in an Image and decoded)
 * @param {String} selector - Selector/scope from where images need to be preloaded. Default is 'img'
 */
const preloadImages = (selector = 'img') => {
    return Promise.all(gsap.utils.toArray(selector).map(el => {
        let img = el;
        if ( el.tagName !== 'IMG' ) {
            const url = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
            if ( !url ) return Promise.resolve();
            img = new Image();
            img.src = url;
        }
        // A broken image shouldn't keep the page from showing
        return img.decode().catch(() => {});
    }));
};

/**
 * Reduced motion: instead of the effect, fade each item out as it leaves the screen
 * @param {NodeList} items - The grid items
 */
const fadeOnScroll = items => {
    items.forEach(item => {
        gsap.to(item, {
            ease: 'none',
            opacity: 0,
            scrollTrigger: {
                trigger: item,
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });
    });
};

export {
    preloadImages,
    fadeOnScroll
};