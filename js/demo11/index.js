import { preloadImages, fadeOnScroll } from '../utils.js';
import { createStage } from '../stage.js';
import { uniform, vec3, sin, cos, min, mix, select, smoothstep } from 'three/tsl';
gsap.registerPlugin(ScrollTrigger);

const grid = document.querySelector('.grid');
const gridItems = [...grid.querySelectorAll('.grid__item')];

// The camera's vertical field of view (degrees)
const FOV = 35;
// The radius of the curve between the floor and the flat grid, in viewport heights
const BEND = 0.25;
// How bright the images are lying on the floor, against the ones standing
const DARKEST = 0.35;
// How close to the camera the floor's images go before they fade out, as a share of the camera's distance
const NEAREST = 0.8;

// The curve's radius, worked out in layout()
const radius = uniform(1);

// From the middle of the screen up the grid is flat. Below it, the grid curves toward the viewer and lies flat on a floor
// that comes toward the viewer, below eye level: further down the page an image is, the nearer and lower it lies. As the page
// scrolls, the images travel away along the floor, curve up and stand into the grid in the middle of the screen
const surface = ({ flatX, flatY, cameraZ }) => {
	// How far the point is below the middle of the screen, along the sheet, and how far round the curve that takes it:
	// up to a quarter turn, where the floor starts
	const below = flatY.negate().max(0);
	const turn = min(below.div(radius), Math.PI / 2);
	// Past the curve, how far along the floor it is
	const along = below.sub(radius.mul(Math.PI / 2)).max(0);
	const position = vec3(
		flatX,
		select(below.greaterThan(0), sin(turn).mul(radius).negate(), flatY),
		cos(turn).oneMinus().mul(radius).add(along)
	);
	return {
		position,
		// Lit from the front: darker the more it lies down
		shade: mix(DARKEST, 1, cos(turn)),
		// Gone before it gets too close to the camera
		opacity: smoothstep(cameraZ.mul(NEAREST - 0.15), cameraZ.mul(NEAREST), position.z).oneMinus()
	};
};

const layout = ({ height }) => {
	radius.value = height * BEND;
};

// Preload images and fonts, and set up the WebGL grid
preloadImages('.grid__item-img').then(() => document.fonts.ready).then(async () => {
	// Without a GPU (or if anything goes wrong), the plain grid stays and the page simply scrolls
	const stage = await createStage({ grid, items: gridItems, fov: FOV, surface, layout }).catch(error => {
		console.warn(`The grid is shown without WebGL (${error.message}).`);
		return null;
	});

	document.body.classList.remove('loading');

	const mm = gsap.matchMedia();

	// Reduced motion: native scrolling, and each image just fades out instead of the effect
	mm.add('(prefers-reduced-motion: reduce)', () => fadeOnScroll(gridItems));

	mm.add('(prefers-reduced-motion: no-preference)', () => {
		// Smooth scrolling initialization (using Lenis https://github.com/darkroomengineering/lenis)
		const lenis = new Lenis({
			lerp: 0.1
		});
		// Lenis runs on GSAP's ticker, so the scroll and the canvas update in the same frame
		lenis.on('scroll', ScrollTrigger.update);
		const scrollFn = time => lenis.raf(time * 1000);
		gsap.ticker.add(scrollFn);
		gsap.ticker.lagSmoothing(0);

		stage?.show();

		return () => {
			stage?.hide();
			gsap.ticker.remove(scrollFn);
			lenis.destroy();
		};
	});
});
