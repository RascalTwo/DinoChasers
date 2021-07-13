import kaboom from "https://kaboomjs.com/lib/0.5.1/kaboom.mjs";

// Names of animations to cycle through
const ANIMATIONS = ['idle', 'walk', 'charge'];
// Names of all dinos
const DINO_NAMES = ['Doux', 'Mort', 'Tard', 'Vita'];

/** @type {import('kaboom').KaboomCtx} */
const k = kaboom({
	canvas: document.querySelector('canvas'),
	width: window.innerWidth,
	height: window.innerHeight - 25
});

/**
 * Load dino with {@link id id} and {@link src src}
 * @param {string} id
 * @param {string} src
 */
const loadDino = (id, src) => k.loadSprite(id, src, {
	sliceX: 24,
	sliceY: 1,
	anims: {
		idle: {
			from: 0,
			to: 3
		},
		walk: {
			from: 4,
			to: 9
		},
		charge: {
			from: 10,
			to: 23
		},
	}
});


k.scene('main', () => {
	DINO_NAMES
		.map((name, i) => k.add([
			k.sprite(name),
			// Vertically center and horizontally spread out (close to) evenly
			k.pos(i * (k.width() / DINO_NAMES.length) + (k.width() / (DINO_NAMES.length * 2)), k.height() / 2),
			k.scale(4),
			'dino',
			{ name, target: DINO_NAMES[(i + 1) % DINO_NAMES.length] }
		])).map(dino => {
			// Add hovering tooltips
			let active = false;
			dino.hovers(() => {
				if (active) return;

				const tooltipHeight = dino.height / 5;
				const background = k.add([
					k.rect(dino.width, tooltipHeight),
					k.scale(4),
					k.color(255, 255, 255),
					k.origin('topleft'),
					k.pos(dino.pos.x, dino.pos.y - tooltipHeight),
				]);
				const text = k.add([
					k.text(dino.name, 12),
					k.color(0, 0, 0),
					k.origin('top'),
					k.pos(dino.pos.x + ((dino.width * dino.scale.x) / 2), dino.pos.y),
				]);

				setTimeout(() => {
					k.destroy(background);
					k.destroy(text);
					active = false;
				}, 250);
			});

			return dino;
		}).map(dino => {
			// Cycle animation on click
			dino.clicks(() => dino.play(ANIMATIONS[(ANIMATIONS.indexOf(dino.curAnim()) + 1) % ANIMATIONS.length]))
			return dino
		}).map(dino => {
			dino.play('idle');
			return dino;
		});
});

(async () => {
	await Promise.all(DINO_NAMES.map(name => loadDino(name, `./dino/sheets/${name.toLowerCase()}.png`)));
	k.start('main');
})().catch(console.error);
