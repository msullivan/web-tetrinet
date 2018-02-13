import { GameState } from 'gamestate';
import { SQUARE_SIZE, BOARD_WIDTH, BOARD_HEIGHT, GAP } from 'consts';
import { connectAndHandshake, processMessage } from 'protocol';

let state: GameState = null;
console.log("Loaded");

let username = 'su11y';
connectAndHandshake(
  username,
  (playerNum: number, sock: WebSocket) => {
    state = new GameState(playerNum,
                          document.getElementById('canvas') as HTMLCanvasElement,
                          null,
                          [document.getElementById('canvas2') as HTMLCanvasElement]);
    document.addEventListener('keydown', state.onKeyDown);
    state.debugMode = true;
    state.start();
    sock.onmessage = (msg) => { processMessage(state, msg) };
  }
);
