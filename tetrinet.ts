import { GameState, GameParams } from 'gamestate';
import { SQUARE_SIZE, BOARD_WIDTH, BOARD_HEIGHT, GAP } from 'consts';
import { connectAndHandshake, processMessage } from 'protocol';
import { sizeCanvasForBoard } from 'draw_util';
import { Special } from 'specials';
import { randInt } from 'util';

let mainCanvas = document.getElementById('canvas') as HTMLCanvasElement;
sizeCanvasForBoard(mainCanvas);

let nextPieceCanvas = document.getElementById('preview') as HTMLCanvasElement;
let specialsCanvas = document.getElementById('specials') as HTMLCanvasElement;

let otherCanvases: HTMLCanvasElement[] = [];
let OTHER_SCALE = 0.5;
for (let i = 0; i < 5; i++) {
  let canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.className = 'canvas-' + i.toString();
  sizeCanvasForBoard(canvas, 0.5);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(OTHER_SCALE, OTHER_SCALE);

  let div = document.getElementById("others");
  div.appendChild(canvas);
  otherCanvases.push(canvas);
}

let params = new GameParams();
params.linesPerSpecial = 1;
params.specialsAdded = 1;
params.specialCapacity = 30;
params.specialFrequencies = []
params.classicMode = true;
for (let i = 0; i < 100; i += 1) {
  params.specialFrequencies.push(Math.floor(i/11.2));
}

export let state: GameState = null;
console.log("Loaded");

function onUpdateSpecials(special: typeof Special) {
  let elem = document.getElementById('specials-caption');
  if (special !== undefined) {
    elem.innerHTML = special.desc;
  } else {
    elem.innerHTML = '';
  }
}

let hostname = window.location.hostname || "localhost";
let url = "ws://" + hostname + ":8081/";
let username = 'Guest' + randInt(10000);
connectAndHandshake(
  url,
  username,
  (playerNum: number, sock: WebSocket) => {
    state = new GameState(playerNum,
                          sock,
                          mainCanvas,
                          nextPieceCanvas,
                          specialsCanvas,
                          otherCanvases,
                          onUpdateSpecials,
                          params);
    document.addEventListener('keydown', state.onKeyDown);
    state.debugMode = true;
    state.requestDraw();
    sock.onmessage = (msg) => { processMessage(state, msg) };
  }
);
