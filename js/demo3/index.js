import { preloadImages, fadeOnScroll } from '../utils.js';
gsap.registerPlugin(ScrollTrigger);

const gridItems = document.querySelectorAll('.grid > .grid__item');

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
		  
		gridItems.forEach(item => {
			
			const image = item.querySelector('.grid__item-img');

			const xPercentRandomVal = gsap.utils.random(-100,100);

			gsap.set(image, {
				transformOrigin: `${xPercentRandomVal < 0 ? 0 : 100}% 100%`
			});

			gsap.to(image, {
	            ease: 'none',
	            scale: 0,
				scrollTrigger: {
	                trigger: item,
	                start: "top top",
	                end: "bottom top",
	                scrub: true,
	            }
	        });

			gsap.to(item, {
	            ease: 'none',
	            xPercent: xPercentRandomVal,
				scrollTrigger: {
	                trigger: item,
	                start: "top bottom",
	                end: "top top",
	                scrub: true
	            }
	        });

		});

		return () => {
			gsap.ticker.remove(scrollFn);
			lenis.destroy();
		};
	});
});
