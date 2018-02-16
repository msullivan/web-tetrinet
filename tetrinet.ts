import { GameState } from 'gamestate';
import { SQUARE_SIZE, BOARD_WIDTH, BOARD_HEIGHT, GAP } from 'consts';
import { connectAndHandshake, processMessage } from 'protocol';
import { sizeCanvasForBoard } from 'draw_util';
import { Special } from 'specials';
import { randInt, $ } from 'util';
import { MessagePane } from 'messagepane';

let mainCanvas = $('canvas') as HTMLCanvasElement;
sizeCanvasForBoard(mainCanvas);

let nextPieceCanvas = $('preview') as HTMLCanvasElement;
let specialsCanvas = $('specials') as HTMLCanvasElement;
let messagesDiv = $('messages') as HTMLDivElement;
let chatDiv = $('chat') as HTMLDivElement;

let otherCanvases: HTMLCanvasElement[] = [];
let OTHER_SCALE = 0.5;
for (let i = 0; i < 5; i++) {
  let canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.id = 'canvas-' + i.toString();
  sizeCanvasForBoard(canvas, 0.5);
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.scale(OTHER_SCALE, OTHER_SCALE);

  let div = $("others");
  div.appendChild(canvas);
  otherCanvases.push(canvas);
}

export let state: GameState = null;
console.log("Loaded");

function connectServer(username: string) {
  $('lobby').classList.remove('hidden');
  $('chat-input').focus();

  let hostname = window.location.hostname || "localhost";
  let url = "ws://" + hostname + ":8081/";
  connectAndHandshake(
    url,
    username,
    (playerNum: number, sock: WebSocket) => {
      state = new GameState(playerNum,
                            username,
                            sock,
                            mainCanvas,
                            nextPieceCanvas,
                            specialsCanvas,
                            otherCanvases,
                            new MessagePane(messagesDiv),
                            new MessagePane(chatDiv));
      document.addEventListener('keydown', state.onKeyDown);
      $('chat-input').addEventListener('keyup', state.onChatKey);
      $('start-button').addEventListener('click', state.onStartClick);
      $('debug-start-button').addEventListener('click', state.onDebugStartClick);
      state.requestDraw();
      sock.onmessage = (msg) => { processMessage(state, msg) };
    }
  );
}

if (window.location.hash) {
  connectServer(window.location.hash.substr(1));
} else {
  let username = prompt("Please choose a username!");
  if (username !== undefined && username !== "") {
    window.location.hash = username;
    connectServer(username);
  }
}
