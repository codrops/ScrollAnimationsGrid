import { preloadImages, fadeOnScroll } from '../utils.js';
gsap.registerPlugin(ScrollTrigger);

const grid = document.querySelector('.grid');
// The grid's perspective (px)
const PERSPECTIVE = 1000;
const gridItems = grid.querySelectorAll('.grid__item');

// Preload images and fonts
preloadImages('.grid__item-img').then(() => document.fonts.ready).then( _ => {
	document.body.classList.remove('loading');

	const mm = gsap.matchMedia();

	// Reduced motion: native scrolling, and each image just fades out instead of the effect
	mm.add('(prefers-reduced-motion: reduce)', () => fadeOnScroll(gridItems));

	mm.add('(prefers-reduced-motion: no-preference)', () => {
		// Smooth scrolling initialization (using Lenis https://github.com/darkroomengineering/lenis)
		const lenis = new Lenis({
			lerp: 0.1
		});
		// Lenis runs on GSAP's ticker, so the scroll and the scrubbed animations update in the same frame
		lenis.on('scroll', ScrollTrigger.update);
		const scrollFn = time => lenis.raf(time * 1000);
		gsap.ticker.add(scrollFn);
		gsap.ticker.lagSmoothing(0);

		// The grid's perspective origin follows the middle of the screen
		// (measured from the grid's top, which sits below the frame on phones)
		let gridTop;
		const setPerspectiveOrigin = () => gsap.set(grid, {
			perspectiveOrigin: `50% ${window.innerHeight/2 + lenis.scroll - gridTop}px`
		});
		const onResize = () => {
			gridTop = grid.offsetTop;
			setPerspectiveOrigin();
		};
		// One 3D space for all the images, so the near ones are drawn over the far ones
		gsap.set(grid, {perspective: PERSPECTIVE, transformStyle: 'preserve-3d'});
		gsap.set(gridItems, {transformStyle: 'preserve-3d'});
		onResize();
		lenis.on('scroll', setPerspectiveOrigin);
		window.addEventListener('resize', onResize);

		gridItems.forEach(item => {

			const image = item.querySelector('.grid__item-img');

			// Each image comes from its own depth
			const zFar = gsap.utils.random(-9000, -6000);

			const setZ = gsap.quickSetter(image, 'z', 'px');
			const setOpacity = gsap.quickSetter(image, 'opacity');

			// The image's depth follows its distance from the middle of the screen, d (in screen heights).
			// From 1.5 (a screen below the bottom edge) it comes out of the dark, far behind the middle of the screen, slowing down as it arrives,
			// and it's in its place when it reaches the middle (0). From there it just scrolls with the page
			const render = d => {
				const t = d / 1.5;
				setZ(zFar * t * t);
				setOpacity(1 - t * t);
			};
			render(1.5);

			// Only the image moves, so the item is measured flat
			ScrollTrigger.create({
				trigger: item,
				start: "center bottom+=100%",
				end: "center center",
				onUpdate: self => render(1.5 * (1 - self.progress))
			});

		});

		return () => {
			gsap.set('.grid__item-img', {clearProps: 'transform,opacity'});
			window.removeEventListener('resize', onResize);
			gsap.ticker.remove(scrollFn);
			lenis.destroy();
		};
	});
});
