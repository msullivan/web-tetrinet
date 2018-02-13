import { State } from 'state';


let state = new State();
state.newPiece();

function draw() {
  let canvas = document.getElementById('canvas') as HTMLCanvasElement;
  let ctx = canvas.getContext('2d', { alpha: false });

  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  state.draw(ctx);

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

function keydown(event: any) {
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

document.addEventListener('keydown', keydown);
load();
tick();
console.log("Loaded");
