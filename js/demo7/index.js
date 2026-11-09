import { preloadImages, fadeOnScroll } from '../utils.js';
gsap.registerPlugin(ScrollTrigger);

const grid = document.querySelector('.grid');
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
		gsap.set(grid, {perspective: 1000});
		onResize();
		lenis.on('scroll', setPerspectiveOrigin);
		window.addEventListener('resize', onResize);
		
		gridItems.forEach(item => {
			
			gsap.to(item, {
	            ease: 'none',
				startAt: {rotationX: 70, scale: 0.7},
				scale: 1,
	            rotationX: -70,
				scrollTrigger: {
	                trigger: item,
	                start: 'top bottom',
	                end: 'bottom top',
	                scrub: true
	            }
	        });

		});

		return () => {
			window.removeEventListener('resize', onResize);
			gsap.ticker.remove(scrollFn);
			lenis.destroy();
		};
	});
});
