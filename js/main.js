import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

let container, stats;
let camera, controls, scene, renderer;

const worldWidth = 128, worldDepth = 128;
const worldHalfWidth = worldWidth / 2;
const worldHalfDepth = worldDepth / 2;
const data = generateHeight(worldWidth, worldDepth);
const clock = new THREE.Clock();

init();

function init() {
	container = document.getElementById('container');

	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
	camera.position.y = getY(worldHalfWidth, worldHalfDepth) * 100 + 100;

	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xbfd1e5);

	const matrix = new THREE.Matrix4();

	const createPlane = (rotation, translation, uvIndices) => {
		const geom = new THREE.PlaneGeometry(100, 100);
		for (let i of uvIndices) geom.attributes.uv.array[i] = 0.5;
		if (rotation) geom.applyMatrix4(rotation);
		if (translation) geom.translate(...translation);
		return geom;
	};

	const pxGeometry = createPlane(new THREE.Matrix4().makeRotationY(Math.PI / 2), [50, 0, 0], [1, 3]);
	const nxGeometry = createPlane(new THREE.Matrix4().makeRotationY(-Math.PI / 2), [-50, 0, 0], [1, 3]);
	const pyGeometry = createPlane(new THREE.Matrix4().makeRotationX(-Math.PI / 2), [0, 50, 0], [5, 7]);
	const pzGeometry = createPlane(null, [0, 0, 50], [1, 3]);
	const nzGeometry = createPlane(new THREE.Matrix4().makeRotationY(Math.PI), [0, 0, -50], [1, 3]);

	const geometries = [];

	for (let z = 0; z < worldDepth; z++) {
		for (let x = 0; x < worldWidth; x++) {
			const h = getY(x, z);

			matrix.makeTranslation(
				x * 100 - worldHalfWidth * 100,
				h * 100,
				z * 100 - worldHalfDepth * 100
			);

			const px = getY(x + 1, z);
			const nx = getY(x - 1, z);
			const pz = getY(x, z + 1);
			const nz = getY(x, z - 1);

			geometries.push(pyGeometry.clone().applyMatrix4(matrix));

			if ((px !== h && px !== h + 1) || x === 0) geometries.push(pxGeometry.clone().applyMatrix4(matrix));
			if ((nx !== h && nx !== h + 1) || x === worldWidth - 1) geometries.push(nxGeometry.clone().applyMatrix4(matrix));
			if ((pz !== h && pz !== h + 1) || z === worldDepth - 1) geometries.push(pzGeometry.clone().applyMatrix4(matrix));
			if ((nz !== h && nz !== h + 1) || z === 0) geometries.push(nzGeometry.clone().applyMatrix4(matrix));
		}
	}

	const geometry = BufferGeometryUtils.mergeGeometries(geometries);
	geometry.computeBoundingSphere();

	const texture = new THREE.TextureLoader().load('./textures/minecraft/atlas.png');
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.magFilter = THREE.NearestFilter;

	const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide }));
	scene.add(mesh);

	const ambientLight = new THREE.AmbientLight(0xeeeeee, 3);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 12);
	directionalLight.position.set(1, 1, 0.5).normalize();
	scene.add(directionalLight);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setAnimationLoop(animate);
	container.appendChild(renderer.domElement);

	controls = new FirstPersonControls(camera, renderer.domElement);
	controls.movementSpeed = 1000;
	controls.lookSpeed = 0.125;
	controls.lookVertical = true;

	stats = new Stats();
	container.appendChild(stats.dom);

	window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	controls.handleResize();
}

function generateHeight(width, height) {
	const data = [], perlin = new ImprovedNoise();
	const size = width * height, z = Math.random() * 100;
	let quality = 2;

	for (let j = 0; j < 4; j++) {
		if (j === 0) for (let i = 0; i < size; i++) data[i] = 0;

		for (let i = 0; i < size; i++) {
			const x = i % width, y = (i / width) | 0;
			data[i] += perlin.noise(x / quality, y / quality, z) * quality;
		}

		quality *= 4;
	}

	return data;
}

function getY(x, z) {
	return (data[x + z * worldWidth] * 0.15) | 0;
}

function animate() {
	render();
	stats.update();
}

function render() {
	controls.update(clock.getDelta());
	renderer.render(scene, camera);
}
