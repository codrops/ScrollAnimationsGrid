import { preloadImages, fadeOnScroll } from '../utils.js';
import { createStage } from '../stage.js';
import { MathUtils } from 'three/webgpu';
import { uniform, vec3, positionGeometry, sin, cos, mix, smoothstep } from 'three/tsl';
gsap.registerPlugin(ScrollTrigger);

const grid = document.querySelector('.grid');
const gridItems = [...grid.querySelectorAll('.grid__item')];

// The camera's vertical field of view (degrees): the wider it is, the faster the tunnel narrows into the distance
const FOV = 40;
// How far round the tunnel the grid wraps: its sides reach SPAN/2 up the walls on either side of the floor
const SPAN = MathUtils.degToRad(160);
// How far below the middle of the screen (in viewport heights) the images leave the tunnel and start opening out flat
const OPEN = 0.3;
// How far down the page (in viewport heights below the middle) the tunnel shows images; they come out of the dark over the last FADE
const FAR = 7;
const FADE = 3;
// How far below the middle of the screen the tunnel's floor reaches where the images open out, at the least, in half viewport
// heights: on narrow screens, where the tunnel is narrow too, its near end comes toward the viewer until it does
const MOUTH = 1.1;
// How bright the images are at the tunnel's far end, against the flat ones
const DARKEST = 0.3;

// The tunnel's radius and how far its near end comes toward the viewer, worked out in layout()
const radius = uniform(1);
const nearZ = uniform(0);

// From the middle of the screen up the grid is flat. Below it, each image lies on the lower half of a round tunnel whose
// far end is the middle of the screen, and rides its walls toward the viewer as the page scrolls
const surface = ({ flatX, flatY, center, size, viewport, gridCenter }) => {
	// How far the image's middle is below the middle of the screen, and how far into the tunnel the image is: 0 flat,
	// from the middle of the screen up, and 1 from OPEN below it. The whole image opens out as one piece
	const below = center.y.negate().max(0);
	const inside = smoothstep(0, viewport.y.mul(OPEN), below);
	// On the tunnel's wall, the image lies along the tunnel with its top toward the far end, so it faces into the tunnel
	// and stands up about its near edge as it opens out. How far along the tunnel the point is, from where the images
	// open out, and how far round from the floor, keeping its distance from the grid's middle along the curve
	const depth = below.sub(viewport.y.mul(OPEN)).add(positionGeometry.y.mul(size.y));
	const angle = flatX.sub(gridCenter).div(radius);
	// Flat on the page, or on the tunnel's wall, and in between while it opens out
	const flat = vec3(flatX, flatY, 0);
	const wall = vec3(gridCenter.add(sin(angle).mul(radius)), cos(angle).mul(radius).negate(), nearZ.sub(depth));
	return {
		position: mix(flat, wall, inside),
		// Darker further into the tunnel, and coming out of the dark at its far end
		shade: mix(1, DARKEST, smoothstep(0, viewport.y.mul(FAR - OPEN), depth).mul(inside)),
		opacity: smoothstep(viewport.y.mul(FAR - OPEN - FADE), viewport.y.mul(FAR - OPEN), depth).oneMinus()
	};
};

const layout = ({ height, gridRect, cameraZ }) => {
	radius.value = gridRect.width / SPAN;
	nearZ.value = Math.max(0, cameraZ * (1 - radius.value / (MOUTH * height / 2)));
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
