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

		const yPercentRandomVal = gsap.utils.random(-200,200);

		gsap.timeline()
		.addLabel('start', 0)
		.set(image, {
			transformOrigin: `300% 50%`
		}, 'start')
        .to(image, {
            ease: 'none',
			startAt: {rotationZ: -30},
            rotationZ: 30,
			scrollTrigger: {
                trigger: item,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
            }
        }, 'start')
		.to(item, {
            ease: 'none',
            yPercent: yPercentRandomVal,
			scrollTrigger: {
                trigger: item,
                start: "top bottom",
                end: "top top",
                scrub: true
            }
        }, 'start');

	});
});

