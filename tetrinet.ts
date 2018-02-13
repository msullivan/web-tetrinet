import { State } from 'state';
import { SQUARE_SIZE, BOARD_WIDTH, BOARD_HEIGHT, GAP } from 'consts';
import { networkTest } from 'protocol';

let state = new State();
state.newPiece();

let pendingDraw = false;

function draw() {
  let canvas = document.getElementById('canvas') as HTMLCanvasElement;
  let ctx = canvas.getContext('2d', { alpha: false });

  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  state.draw(ctx);

  pendingDraw = false;
}

function requestDraw() {
  if (pendingDraw) { return; }
  pendingDraw = true;
  requestAnimationFrame(draw);
}

function load() {
  requestDraw();
}

function tick() {
  if (!state.move(0, 1)) { state.freeze(); }

  state.timeoutID = setTimeout(tick, state.tickTime);

  requestDraw();
}

function resetTimeout() {
  clearTimeout(state.timeoutID);
  state.timeoutID = setTimeout(tick, state.tickTime);
}

function keydown(event: any) {
  console.log(event.key);

  if (event.key === 'ArrowUp') {
    state.rotate();
  } else if (event.key === 'ArrowLeft') {
    state.move(-1, 0);
  } else if (event.key === 'ArrowRight') {
    state.move(1, 0);
  } else if (event.key === 'ArrowDown') {
    if (!state.move(0, 1)) {
      state.freeze();
    }
    resetTimeout();
  } else if (event.key === ' ') {
    state.drop();
    state.freeze();
    resetTimeout();
  }

  requestDraw();
}

let canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = SQUARE_SIZE * BOARD_WIDTH + GAP * (BOARD_WIDTH + 1);
canvas.height = SQUARE_SIZE * BOARD_HEIGHT + GAP * (BOARD_HEIGHT + 1);
document.addEventListener('keydown', keydown);
load();
tick();
console.log("Loaded");
networkTest();
