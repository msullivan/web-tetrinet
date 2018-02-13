import { GameState } from 'gamestate';
import { SQUARE_SIZE, BOARD_WIDTH, BOARD_HEIGHT, GAP } from 'consts';
import { networkTest } from 'protocol';

let state = new GameState(0, document.getElementById('canvas') as HTMLCanvasElement,
                          null, null);
document.addEventListener('keydown', state.onKeyDown);
state.start();
console.log("Loaded");
networkTest();
