import kaboom from "https://kaboomjs.com/lib/0.5.1/kaboom.mjs";

// Names of animations to cycle through
const ANIMATIONS = ['idle', 'walk', 'charge'];
// Names of all dinos
const DINO_NAMES = ['Mort', 'Vita', 'Doux', 'Tard'];
const TOOLTIP_DISAPPEAR_DELEY = 2.5;
const RESPAWN_RANGE = [2.5, 7.5];

/** @type {import('kaboom').KaboomCtx} */
const k = kaboom({
	canvas: document.querySelector('canvas'),
	width: window.innerWidth,
	height: window.innerHeight - 25,
	debug: true
});

window.k = k

/** Minimum distance new dinos must be from other dinos */
const MINIMUM_DINO_SPACING = Math.min(k.width(), k.height()) / 3;

/**
 * Generate random float between two numbers
 *
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const randomBetween = (min, max) => Math.random() * (max - min) + min;

/**
 * Choose random element from array
 *
 * @param {any[]} arr
 * @returns {any}
 */
const randomFrom = arr => arr[Math.floor(randomBetween(0, arr.length))];

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


/**
 * @typedef DinoType
 * @type {{ name: string, score: number, targetIndex: number, cycleTarget: () => void } & import("kaboom").GameObj & import("kaboom").SpriteComp & import("kaboom").PosComp & import("kaboom").OriginComp & import("kaboom").RotateComp & import("kaboom").ScaleComp & import("kaboom").AreaComp}
 */

k.scene('main', () => {
	/**
	 * Randomly position provided dino
	 *
	 * @param {DinoType} dino
	 */
	const randomlyPositionDino = dino => {
		const actualWidth = dino.width * dino.scale.x;
		const actualHeight = dino.height * dino.scale.y;
		dino.pos.x = (Math.random() * (k.width() - actualWidth)) + (actualWidth / 2);
		dino.pos.y = (Math.random() * (k.height() - actualHeight)) + (actualHeight / 2);
	}


	/**
	 * @param {DinoType} target
	 */
	const attackDino = (dino, target) => {
		// If dinos have eachother as targets, 50/50 chance for each to be destroyed
		let possibles = [target];
		if (dinos[target.targetIndex] === dino) possibles.push(dino);
		const destroying = randomFrom(possibles);

		// Increment score of dino not being destroyed
		(destroying === dino ? target : dino).score++;

		k.destroy(destroying);
		k.wait(randomBetween(...RESPAWN_RANGE), () => {
			const reborn = createDino(destroying.name, {
				targetIndex: Math.floor(Math.random() * dinos.length),
				score: destroying.score
			});

			// Keep on positioning until it's far enough from other dinos
			while(true){
				randomlyPositionDino(reborn);

				const leastDistance = dinos.reduce((least, other) =>
					Math.min(least, reborn.pos.dist(other.pos)),
					Number.MAX_SAFE_INTEGER
				);
				if (leastDistance > MINIMUM_DINO_SPACING) break;
			}
			// Replace old dino with reborn dino
			dinos.splice(dinos.findIndex(other => reborn.name === other.name), 1, reborn);
		});
	}

	const createDino = (name, props) => {
		/** @type {DinoType} */
		const dino = k.add([
			k.sprite(name),
			k.pos(0, 0), // Positioned later
			k.origin('center'),
			k.rotate(0), // To allow for rotating
			k.scale(4, 4),
			'dino',
			{
				score: 0,
				targetIndex: 0,
				...props,
				name,
				cycleTarget(){
					this.targetIndex = (this.targetIndex + 1) % dinos.length;
					// Handle when new target is already colliding with dino
					const target = dinos[this.targetIndex];
					if (this !== target && this.isCollided(target)) attackDino(this, target);
				}
			}
		]);

		// Tooltips above dinos on hover
		(() => {
			/** @type {null | [import("kaboom").GameObj, import("kaboom").GameObj]} */
			let tooltip = null;
			const destroyTooltip = () => {
				if (tooltip === null) return;
				tooltip.forEach(k.destroy);
				tooltip = null;
			}
			dino.hovers(() => {
				if (tooltip !== null) return;

				const y = dino.pos.y - ((dino.height * dino.scale.y) / 2);
				tooltip = [
					k.add([
						k.rect(dino.width, dino.height / 5),
						k.scale(4),
						k.color(255, 255, 255),
						k.origin('center'),
						k.pos(dino.pos.x, y),
					]),
					k.add([
						k.text(`${dino.name} - ${dino.score}`, 12),
						k.color(0, 0, 0),
						k.origin('center'),
						k.pos(dino.pos.x, y),
					])
				];

				k.wait(TOOLTIP_DISAPPEAR_DELEY, destroyTooltip);
			});

			dino.on('destroy', destroyTooltip);

			dino.on('update', () => {
				if (tooltip === null) return;

				tooltip.forEach(o => {
					o.pos.x = dino.pos.x;
					o.pos.y = dino.pos.y - ((dino.height * dino.scale.y) / 2);
				});
			});
		})();


		// Collide with target dino
		(() => {
			dino.collides('dino', (/** @type {DinoType} */other) => {
				const target = dinos[dino.targetIndex];
				if (other === target && target.exists()) attackDino(dino, target);;
			})
		})();


		// Cycle target on click
		(() => {
			dino.clicks(dino.cycleTarget);
		})();

		// Pathfind to target dino
		(() => {
			const SPEED = Math.min(k.width(), k.height()) / 20;

			dino.action(() => {
				let target = dinos[dino.targetIndex];
				if (!target.exists() || dino === target) {
					// If there are still active dinos, cycle to next one
					if (dinos.filter(d => d.exists()).length > 1) return dino.cycleTarget();

					// otherwise pathfind to center
					target = {
						pos: k.vec2(Math.floor(k.width() / 2), Math.floor(k.height() / 2))
					};
				}

				// Only possible when pathfinding to center, so reset angle and idle
				if (dino.pos.dist(target.pos) <= 1){
					dino.angle = 0;
					if (dino.curAnim() !== 'idle') dino.play('idle');
					return;
				}
				if (dino.curAnim() !== 'walk') dino.play('walk');


				const lookLeft = dino.pos.x > target.pos.x;
				dino.flipX(lookLeft ? -1 : 1);

				// Math to calculate correct angle to rotate the dino to face it's target
				const angle = dino.pos.angle(target.pos);
				dino.angle = lookLeft ? angle : -(angle + 3.14);
				dino.move(-Math.cos(angle) * SPEED, -Math.sin(angle) * SPEED);
			});
		})();

		return dino
	}

	const dinos = DINO_NAMES.map(name => createDino(name));

	for (let i = 0; i < dinos.length; i++) dinos[i].targetIndex = (i + 1) % dinos.length

	// Keep on repositioning dinos until they are far enough from eachother
	while(true) {
		for (const dino of dinos) randomlyPositionDino(dino);

		let leastDistance = Number.MAX_SAFE_INTEGER;
		for (const dino of dinos){
			for (const other of dinos){
				if (dino === other) continue
				leastDistance = Math.min(leastDistance, dino.pos.dist(other.pos))
			}
		}
		if (leastDistance > MINIMUM_DINO_SPACING) break;
	}

});

(async () => {
	await Promise.all(DINO_NAMES.map(name => loadDino(name, `./dino/sheets/${name.toLowerCase()}.png`)));
	k.start('main');
})().catch(console.error);
