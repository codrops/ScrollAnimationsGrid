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

		gsap.set(image, {
			transformOrigin: `50% 100%`
		});
        
		gsap.to(image, {
            ease: 'none',
			scaleX: .5,
			scaleY: 3,
			scrollTrigger: {
				trigger: item,
                start: 'top 30%',
                end: 'bottom top',
                scrub: true,
            }
        });
		
		gsap.to(item, {
            ease: 'none',
            opacity: 0,
			scrollTrigger: {
                trigger: item,
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });

	});
});

