// three.js (its WebGPU build, which falls back to WebGL 2) and its shading language, TSL
import * as THREE from 'three/webgpu';
import { Fn, uniform, texture, uv, vec2, vec4, positionGeometry, min } from 'three/tsl';

// Texture coordinates that frame an image like the grid's `background-size: cover` at `background-position: 50% 50%`
const cover = Fn(([uv, size, image]) => {
	const ratio = vec2(
		min(size.x.div(size.y).div(image.x.div(image.y)), 1),
		min(size.y.div(size.x).div(image.y.div(image.x)), 1)
	);
	return uv.mul(ratio).add(vec2(0.5, 0.5).mul(ratio.oneMinus()));
});

// Whether the browser draws on the CPU (no GPU, or a blocklisted one), too slow for this
const isSoftware = renderer => {
	const { backend } = renderer;
	if ( backend.isWebGPUBackend ) return backend.device.adapterInfo?.isFallbackAdapter === true;
	const { gl } = backend;
	const info = gl.getExtension('WEBGL_debug_renderer_info');
	const name = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
	return /swiftshader|llvmpipe|software/i.test(name);
};

/**
 * The WebGL grid of pages 10–12: a canvas behind the page's text that draws every grid image where its DOM element is,
 * moved onto the page's own surface. One world unit is one CSS pixel on the z = 0 plane, with the origin in the middle
 * of the screen and y up.
 * @param {Object} options
 * @param {Element} options.grid - The grid
 * @param {Element[]} options.items - Its items, each with a `.grid__item-img`
 * @param {Number} options.fov - The camera's vertical field of view (degrees)
 * @param {Function} options.surface - Builds one image's shader nodes. It gets `flatX`, `flatY` (a point of the image as it lies
 * flat on the page), `center`, `size` (the image's middle and size), `viewport`, `gridCenter`, `gridWidth` and `cameraZ`,
 * and returns `position` (where the point goes), `shade` (how bright the image looks there, 1 as on the page) and `opacity`
 * @param {Function} [options.layout] - Called with `{ width, height, gridRect, cameraZ }` before every frame, to set the
 * page's own uniforms
 * @param {Number} [options.segments] - Columns and rows of vertices across each image, enough for it to bend smoothly
 * @returns {Promise<{show: Function, hide: Function}>} Rejects if the browser can't draw it on a GPU
 */
const createStage = async ({ grid, items, fov, surface, layout = () => {}, segments = 24 }) => {
	const renderer = new THREE.WebGPURenderer({ alpha: true, antialias: true });
	await renderer.init();
	if ( isSoftware(renderer) ) {
		renderer.dispose();
		throw new Error('software rendering only');
	}
	renderer.setClearColor(0x000000, 0);
	renderer.domElement.classList.add('grid-canvas');
	document.body.append(renderer.domElement);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(fov, 1, 1, 10000);
	// What every surface may need: the viewport's size, the grid's middle (x) and width, and the camera's distance
	const viewport = uniform(new THREE.Vector2(1, 1));
	const gridCenter = uniform(0);
	const gridWidth = uniform(1);
	const cameraZ = uniform(1);
	const geometry = new THREE.PlaneGeometry(1, 1, segments, segments);
	const loader = new THREE.TextureLoader();

	const meshes = await Promise.all(items.map(async item => {
		const image = item.querySelector('.grid__item-img');
		const map = await loader.loadAsync(getComputedStyle(image).backgroundImage.slice(5, -2));
		map.colorSpace = THREE.SRGBColorSpace;
		map.anisotropy = 4;

		// The image's middle and size on the page, flat, in world units
		const center = uniform(new THREE.Vector2(0, 0));
		const size = uniform(new THREE.Vector2(1, 1));
		// A point of the image as it lies flat on the page (from the plane's own geometry: once the material moves the
		// points, positionLocal is the moved one in the fragment shader)
		const flatX = center.x.add(positionGeometry.x.mul(size.x));
		const flatY = center.y.add(positionGeometry.y.mul(size.y));
		const { position, shade, opacity } = surface({ flatX, flatY, center, size, viewport, gridCenter, gridWidth, cameraZ });

		const material = new THREE.MeshBasicNodeMaterial({ transparent: true });
		material.positionNode = position;
		// The image, framed as on the page. The shade is how bright it looks, so it's raised to 2.2 before it darkens the
		// image: the shader works in linear colour.
		material.colorNode = Fn(() => {
			const color = texture(map, cover(uv(), size, vec2(map.image.width, map.image.height))).rgb;
			return vec4(color.mul(shade.pow(2.2)), opacity);
		})();

		// The shader places it from the page's layout, so it stays at the origin and is never culled
		const mesh = new THREE.Mesh(geometry, material);
		mesh.frustumCulled = false;
		mesh.userData = { item, center, size };
		scene.add(mesh);
		return mesh;
	}));

	// Hand the shaders every image's place on the page, and draw the ones further down first: on every surface they're
	// the further away, so the nearer ones cover them
	const place = () => {
		const { innerWidth: width, innerHeight: height } = window;
		const gridRect = grid.getBoundingClientRect();
		gridCenter.value = gridRect.left + gridRect.width / 2 - width / 2;
		gridWidth.value = gridRect.width;
		layout({ width, height, gridRect, cameraZ: camera.position.z });
		meshes.forEach(mesh => {
			const rect = mesh.userData.item.getBoundingClientRect();
			const y = height / 2 - rect.top - rect.height / 2;
			mesh.userData.center.value.set(rect.left + rect.width / 2 - width / 2, y);
			mesh.userData.size.value.set(rect.width, rect.height);
			mesh.renderOrder = Math.min(y, 0);
		});
	};

	// Match the canvas and camera to the viewport, with the z = 0 plane exactly the viewport's size
	const resize = () => {
		const { innerWidth: width, innerHeight: height } = window;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.position.z = height / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
		camera.near = camera.position.z / 10;
		camera.far = camera.position.z * 10;
		camera.updateProjectionMatrix();
		viewport.value.set(width, height);
		cameraZ.value = camera.position.z;
	};

	// Draw only when something moved: the page scrolled, or the window changed size
	let lastScroll = null;
	let needsResize = true;
	const onResize = () => needsResize = true;
	const render = () => {
		if ( needsResize ) {
			resize();
			needsResize = false;
			lastScroll = null;
		}
		if ( window.scrollY === lastScroll ) return;
		lastScroll = window.scrollY;
		place();
		renderer.render(scene, camera);
	};

	// Swap the DOM images for the canvas, drawing on GSAP's ticker (after Lenis has scrolled)
	const show = () => {
		document.documentElement.classList.add('is-webgl');
		needsResize = true;
		window.addEventListener('resize', onResize);
		gsap.ticker.add(render);
		render();
	};
	// And back
	const hide = () => {
		gsap.ticker.remove(render);
		window.removeEventListener('resize', onResize);
		document.documentElement.classList.remove('is-webgl');
	};

	// If the GPU drops the canvas (a driver reset, for one), show the DOM images again
	renderer.onDeviceLost = info => {
		console.warn(`The ${info.api} device was lost, the grid is shown without WebGL.`, info.message);
		hide();
	};

	// Compile the shaders now, so the first frames don't stutter
	resize();
	place();
	await renderer.compileAsync(scene, camera);

	return { show, hide };
};

export {
	createStage
};
