import { preloadImages } from '../utils';
import Lenis from '@studio-freight/lenis'
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const gridItems = [...document.querySelectorAll('.grid > .grid__item')];

// Preload images
preloadImages('.grid__item-img').then( _ => {
	document.body.classList.remove('loading');
	
	// Smooth scrolling initialization (using Lenis https://github.com/studio-freight/lenis)
	const lenis = new Lenis({
		lerp: 0.1,
		smooth: true,
	});
	const scrollFn = () => {
		lenis.raf();
		requestAnimationFrame(scrollFn);
	};
	requestAnimationFrame(scrollFn);
	  
	gridItems.forEach(item => {
		
		const image = item.querySelector('.grid__item-img');

		gsap.timeline()
		.set(image, {
			transformOrigin: `0% 100%`
		})
        .to(image, {
            ease: 'back.in(2)',
			scaleX: 0,
			scaleY: 2.5,
			skewY: gsap.utils.random(-5,5),
			scrollTrigger: {
				trigger: item,
                start: "top 70%",
                end: "bottom top",
                scrub: 0.1,
            }
        });

	});
});

