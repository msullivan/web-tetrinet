const SQUARE_SIZE: number = 30;
const GAP: number = 2;
const BOARD_WIDTH: number = 12;
const BOARD_HEIGHT: number = 22;
const INITIAL_X = 6;

class Shape {
  coords: number[][];

  constructor(coords) {
    this.coords = coords;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    for (let coord of this.coords) {
      square(ctx, coord[0] + x, coord[1] + y);
    }
  }
}

class Piece {
  shapes: Shape[];
  constructor(shapes) {
    this.shapes = shapes;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, orientation: number) {
    const shape = this.shapes[orientation % this.shapes.length];
    shape.draw(ctx, x, y);
  }
}

// https://tetris.wiki/TetriNet_Rotation_System
let PIECES = [
  // 4x1
  new Piece([
    new Shape([[-2, 0], [-1, 0], [0, 0], [1, 0]]),
    new Shape([[0, 0], [0, 1], [0, 2], [0, 3]]),
  ]),
  // 2x2
  new Piece([
    new Shape([[0, 0], [0, 1], [1, 0], [1, 1]]),
  ]),
  // J
  new Piece([
    new Shape([[-1, 0], [-1, 1], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [0, 0], [-1, 1], [-1, 2]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [1, 1]]),
    new Shape([[0, 0], [0, 1], [0, 2], [-1, 2]])
  ]),
  // L
  new Piece([
    new Shape([[1, 0], [-1, 1], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [0, 2], [-1, 1], [-1, 2]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [-1, 1]]),
    new Shape([[-1, 0], [0, 0], [0, 1], [0, 2]])
  ]),
  // S
  new Piece([
    new Shape([[0, 0], [1, 0], [-1, 1], [0, 1]]),
    new Shape([[-1, 0], [-1, 1], [0, 1], [0, 2]]),
  ]),
  // Z
  new Piece([
    new Shape([[-1, 0], [0, 0], [0, 1], [1, 1]]),
    new Shape([[0, 0], [-1, 1], [0, 1], [-1, 2]])
  ]),
  // T
  new Piece([
    new Shape([[-1, 1], [0, 0], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [-1, 1], [-1, 2], [0, 1]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [0, 1]]),
    new Shape([[0, 0], [0, 1], [0, 2], [-1, 1]])
  ])
];

const COLORS = [
  undefined,
  'rgb(255, 0, 0)',
  'rgb(0, 255, 0)',
  'rgb(0, 0, 255)',
  'rgb(255, 255, 0)',
  'rgb(255, 0, 255)',
  'rgb(0, 255, 255)',
];

function randInt(num: number): number {
  return Math.floor(Math.random() * num);
}

function randomColor(): number {
  return 1 + randInt(COLORS.length - 1);
}

const CLEARED_COLOR = 'rgb(200, 200, 200)';

class State {
  board: number[][];
  x: number;
  y: number;
  piece: number;
  orientation: number;
  color: number;
  timeoutID: number;
  tickTime: number;

  constructor() {
    this.board = new Array(BOARD_WIDTH);
    for (let i = 0; i < BOARD_WIDTH; i += 1) {
      this.board[i] = new Array(BOARD_HEIGHT);
    }

    console.log(this.board);

    this.piece = 3;
    this.orientation = 0;
    this.x = INITIAL_X;
    this.y = 0;
    this.color = 4;
    this.tickTime = 1000;
  }

  rotate = () => {
    const new_orientation = (this.orientation + 1) % PIECES[this.piece].shapes.length;
    if (this.intersects(PIECES[this.piece].shapes[new_orientation],
                        this.x, this.y)) {
      return;
    } else {
      this.orientation = new_orientation;
    }
  }

  intersects = (shape: Shape, x: number, y: number) => {
    for (let coord of shape.coords) {
      let new_x: number = coord[0] + x;
      let new_y: number = coord[1] + y;

      if (this.board[new_x] === undefined ||
          this.board[new_x][new_y] !== undefined ||
          new_y >= BOARD_HEIGHT ||
          new_x < 0 ||
          new_x >= BOARD_WIDTH) {
        return true;
      }
    }

    return false;
  }

  curShape = () => {
    // TODO: store piece object instead?
    return PIECES[this.piece].shapes[this.orientation];
  }

  move = (dx, dy) => {
    let new_x = this.x + dx;
    let new_y = this.y + dy;
    let shape = this.curShape();

    if (this.intersects(this.curShape(), new_x, new_y)) {
      return false;
    } else {
      this.x = new_x;
      this.y = new_y;
      return true;
    }
  }

  drop = () => {
    while (this.move(0, 1)) {}
  }

  draw = (ctx: CanvasRenderingContext2D) => {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        const this_square = this.board[x][y];
        if (this_square === undefined) {
            ctx.fillStyle = CLEARED_COLOR;
        } else {
          ctx.fillStyle = COLORS[this_square];
        }
        square(ctx, x, y);
      }
    }

    ctx.fillStyle = COLORS[this.color];
    PIECES[this.piece].draw(ctx, this.x, this.y, this.orientation);
  }

  removeLines = () => {
    const removeLine = (lineNo) => {
      for (; lineNo > 0; lineNo -= 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          this.board[x][lineNo] = this.board[x][lineNo - 1];
        }
      }

      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        this.board[x][0] = undefined;
      }
    };

    for (let lineNo = 0; lineNo < BOARD_HEIGHT; lineNo += 1) {
      let found = false;
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (this.board[x][lineNo] === undefined) {
          found = true;
          break;
        }
      }

      if (!found) { removeLine(lineNo); }
    }
  }

  freeze = () => {
    const shape = this.curShape();
    for (let coord of shape.coords) {
      this.board[coord[0] + this.x][coord[1] + this.y] = this.color;
    }

    this.removeLines();

    this.x = INITIAL_X;
    this.y = 0;
    this.color = randomColor();
    this.piece = randInt(PIECES.length); //randomPiece(); TODO
    this.orientation = randInt(PIECES[this.piece].shapes.length);
  }

}

function square(ctx, x, y) {
  ctx.fillRect(x * (SQUARE_SIZE + GAP), y * (SQUARE_SIZE + GAP),
               SQUARE_SIZE, SQUARE_SIZE);
}

let state = new State();

function draw() {
  let canvas = document.getElementById('canvas') as HTMLCanvasElement;
  let ctx = canvas.getContext('2d', { alpha: false });

  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  new state.draw(ctx);

  requestAnimationFrame(draw);
}

function load() {
  draw();
}

function tick() {
  if (!state.move(0, 1)) { state.freeze(); }

  state.timeoutID = setTimeout(tick, state.tickTime);
}

function resetTimeout() {
  clearTimeout(state.timeoutID);
  state.timeoutID = setTimeout(tick, state.tickTime);
}

function keydown(event) {
  console.log(event.key);

  if (event.key === 'ArrowUp') {
    state.rotate();
  } else if (event.key === 'ArrowLeft') {
    state.move(-1, 0);
  } else if (event.key === 'ArrowRight') {
    state.move(1, 0);
  } else if (event.key === 'ArrowDown') {
    state.move(0, 1);
    resetTimeout();
  } else if (event.key === ' ') {
    state.drop();
    state.freeze();
    resetTimeout();
  }
}

tick();

document.addEventListener('keydown', keydown);
