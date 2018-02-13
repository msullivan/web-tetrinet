import { GameState } from 'gamestate';
import { SQUARE_SIZE, BOARD_WIDTH, BOARD_HEIGHT, GAP } from 'consts';
import { connectAndHandshake, processMessage } from 'protocol';
import { sizeCanvasForBoard } from 'draw_util';

let mainCanvas = document.getElementById('canvas') as HTMLCanvasElement;
sizeCanvasForBoard(mainCanvas);

let otherCanvases: HTMLCanvasElement[] = [];
let OTHER_SCALE = 0.5;
for (let i = 0; i < 5; i++) {
  let canvas = document.createElement('canvas') as HTMLCanvasElement;
  sizeCanvasForBoard(canvas, 0.5);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(OTHER_SCALE, OTHER_SCALE);

  let div = document.getElementById("others");
  div.appendChild(canvas);
  otherCanvases.push(canvas);
}

let state: GameState = null;
console.log("Loaded");

let username = 'su11y';
connectAndHandshake(
  username,
  (playerNum: number, sock: WebSocket) => {
    state = new GameState(playerNum,
                          mainCanvas,
                          null,
                          otherCanvases);
    document.addEventListener('keydown', state.onKeyDown);
    state.debugMode = true;
    state.start();
    sock.onmessage = (msg) => { processMessage(state, msg) };
  }
);
