class Grid {
	constructor(world, width, height) {
		this.world = world;
		this.width = width;
		this.height = height;
		this.finder = new PF.AStarFinder();
		this.cells = [];

		for (let y = 0; y < height; y++) {
			this.cells[y] = [];

			for (let x = 0; x < width; x++) {
				this.cells[y][x] = new Cell(this, x, y);
			}
		}
	}

	createWatermark(scale) {
		let watermark = new PIXI.Container();
		let light = true;

		for (let x = 0; x < this.width; x++ ) {
			for (let y = 0; y < this.height; y++) {
				let box = Utils.Graphics.rectangle(scale, scale, light ? 0x666666 : 0x606060);
				box.position.set(x * scale, y * scale);

				watermark.addChild(box);

				light = !light;
			}

			if (this.height % 2 === 0) light = !light;
		}

		return watermark;
	}

	stopHighlightAll() {
		for (let x = 0; x < this.width; x++ ) {
			for (let y = 0; y < this.height; y++) {
				this.find(x, y).stopHighlight();
			}
		}
	}

	find(x, y, scale = 1) {
		x = Math.floor(x / scale);
		y = Math.floor(y / scale);

		if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
			console.warn('Trying to get an out of bounds cell (' + x + ', ' + y + ').');
			return null;
		}

		return this.cells[y][x];
	}

	path(start, end) {
		let nodes = new PF.Grid(this.width, this.height);

		this.world.beings.items.forEach(being => {
			if (!being.walkable) {
				nodes.setWalkableAt(being.cell.x, being.cell.y, false);
			}
		});

		return new Path(this.finder.findPath(start.x, start.y, end.x, end.y, nodes).map(coords => this.find(coords[0], coords[1])));
	}

	cluster(origin, radius) {
		let cells = [];

		for (let x = 0; x < this.width; x++) {
			for (let y = 0; y < this.height; y++) {
				let cell = this.find(x, y);
				if (cell.distanceTo(origin) < radius) cells.push(cell);
			}
		}

		return new Cluster(cells);
	}
}

class Cell {
	constructor(grid, x, y) {
		this.grid = grid;
		this.x = x;
		this.y = y;
		this.highlightGraphics = null;
	}

	distanceTo(cell) {
		let a = cell.x - this.x;
		let b = cell.y - this.y;

		return Math.sqrt(a * a + b * b);
	}

	highlight(color, scale) {
		this.highlightGraphics = Utils.Graphics.rectangle(scale, scale, color);
		this.highlightGraphics.alpha = 0.5;
		this.highlightGraphics.position.set(this.x * scale, this.y * scale);

		this.grid.world.graphics.addChild(this.highlightGraphics);
	}

	stopHighlight() {
		if (this.highlightGraphics && this.highlightGraphics.parent) {
			this.highlightGraphics.parent.removeChild(this.highlightGraphics);
		}
	}

	get content() {
		let result = null;

		this.grid.world.beings.items.forEach(being => {
			if (being.cell === this) result = being;
		});

		return result;
	}

	get empty() {
		return this.content === null;
	}
}

class CellGroup {
	constructor(cells) {
		this.cells = cells;
	}

	filter(callback) {
		this.cells = this.cells.filter(callback);

		return this;
	}

	randomCell() {
		return Utils.Random.fromArray(this.cells);
	}

	get length() { return this.cells.length; }
}

class Path extends CellGroup {
	constructor(cells) {
		super(cells);
	}

	follow(callback) {
		return new Promise((resolve, reject) => {
			let path = this.cells.slice();

			let next = (last) => {
				// Force null for cleaner results and consistency.
				if (typeof last === 'undefined') last = null;

				if (path.length > 0) {
					let promise = callback(path.shift());

					if (promise) promise.then(data => next(data)).catch(data => resolve(data));
					else resolve(last);
				} else {
					resolve(last);
				}
			};

			next(null);
		});
	}

	limit(length) {
		this.cells = this.cells.slice(0, length);

		return this;
	}

	shift(count = 1) {
		this.cells = this.cells.slice(count);

		return this;
	}
}

class Cluster extends CellGroup {
	constructor(cells) {
		super(cells);
	}
}