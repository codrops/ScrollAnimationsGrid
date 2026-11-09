import { preloadImages, fadeOnScroll } from '../utils.js';
import { createStage } from '../stage.js';
import { uniform, vec3, sin, cos, mix, smoothstep } from 'three/tsl';
gsap.registerPlugin(ScrollTrigger);

const grid = document.querySelector('.grid');
const gridItems = [...grid.querySelectorAll('.grid__item')];

// The camera's vertical field of view (degrees)
const FOV = 50;
// The globe's curve downward, as a radius in viewport heights: the tighter it is, the higher its horizon on the screen
const CURVE = 0.6;
// Its curve sideways, as a radius in grid widths: gentler, so the grid's sides only lean back a little
const CURVE_SIDEWAYS = 0.6;
// How far below the middle of the screen (in viewport heights) an image's middle goes before it takes the whole sideways
// curve, so the images turn flat across as they reach the middle (each image takes it as one piece, so it never twists)
const SIDEWAYS_IN = 0.35;
// How bright the images are where they face away from the viewer, against the flat ones
const DARKEST = 0.15;

// The globe's radii, worked out in layout()
const radiusDown = uniform(1);
const radiusSideways = uniform(1);

// From the middle of the screen up the grid is flat. Below it, the grid is printed on a globe that curves away from the
// viewer: further down the page an image is, the further round the globe, so the images come up over its horizon as the
// page scrolls, roll toward the viewer and flatten by the middle of the screen
const surface = ({ flatX, flatY, center, viewport, gridCenter }) => {
	// How far round the globe the point is: downward, its distance below the middle along the curve, and sideways, its
	// distance from the grid's middle along a curve that comes in as the image's middle goes below the middle of the screen
	const below = flatY.negate().max(0);
	const down = below.div(radiusDown);
	const curveSideways = smoothstep(0, viewport.y.mul(SIDEWAYS_IN), center.y.negate()).div(radiusSideways).max(1e-6);
	const sideways = flatX.sub(gridCenter).mul(curveSideways);
	const position = vec3(
		gridCenter.add(sin(sideways).div(curveSideways)),
		sin(down).mul(radiusDown).negate().add(flatY.max(0)),
		cos(down).oneMinus().mul(radiusDown).add(cos(sideways).oneMinus().div(curveSideways)).negate()
	);
	// Lit from the front: darker the more it faces away, and gone past the back of the globe (beyond the horizon its
	// triangles face away and aren't drawn)
	const facing = cos(down).mul(cos(sideways)).max(0).pow(1.5);
	return {
		position,
		shade: mix(DARKEST, 1, facing),
		opacity: smoothstep(2.2, 2.6, down).oneMinus()
	};
};

const layout = ({ height, gridRect }) => {
	radiusDown.value = height * CURVE;
	radiusSideways.value = gridRect.width * CURVE_SIDEWAYS;
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
