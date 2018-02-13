import { BOARD_WIDTH, BOARD_HEIGHT } from "consts";
import { SPECIALS, Special } from 'specials';
import { GameState } from 'gamestate';
import { BoardState, Cell } from 'boardstate';

export function loginEncode(s: string): string {
  const toHex = (x: number): string => {
    return ('0'+x.toString(16)).substr(-2).toUpperCase();
  };

  let ip: number[] = [127, 0, 0, 1];
  let h = (54 * ip[0] + 41 * ip[1] + 29 * ip[2] + 17 * ip[3]).toString();
  let dec = 128; // there is no reason to actually make this random.
  let enc: string = toHex(dec);

  for (let i = 0; i < s.length; i++) {
    dec = ((dec + s.charCodeAt(i)) % 255) ^ h.charCodeAt(i % h.length);
    enc += toHex(dec);
  }
  return enc;
}

// The proxy "protocol" has an extra round trip in it so the caller needs
// to set up its onmessage handler in its onopen handler.
function connectProxy(onopen: () => void): WebSocket {
  var sock = new WebSocket("ws://localhost:8081/");
  sock.onopen = (event) => {
    sock.send("Hi!");
  };

  var ready = false;
  var num = 0;
  sock.onmessage = (event) => {
    sock.onmessage = undefined;
    onopen();
  };
  return sock;
}

const PARTIAL_UPDATE_CHARS = '!"#$%&\'()*+,-./'
const    FULL_UPDATE_CHARS = '012345acnrsbgqo'
let special_map: {[index:string]: typeof Special} = {};
for (let spec of SPECIALS) {
  special_map[spec.identifier.toLowerCase()] = spec;
}

function cellUpdate(board: BoardState, x: number, y: number,
                    code: string) {
  let color = 1;
  let special = undefined;
  if (special_map[code]) {
    special = special_map[code];
  } else {
    color = parseInt(code);
  }

  if (color == 0) {
    board.board[x][y] = undefined;
  } else {
    board.board[x][y] = new Cell(color, special);
  }
}

function partialCodeToFull(part: string): string {
  let i = PARTIAL_UPDATE_CHARS.indexOf(part);
  return i == -1 ? null : FULL_UPDATE_CHARS[i];
}

const INDEX_CODE_BASE = "3".charCodeAt(0);
function fieldUpdate(state: GameState, player: number, fieldstring: string) {
  let isPartial = partialCodeToFull(fieldstring[0]) !== null;
  let board = state.playerBoard(player);

  if (isPartial) {
    // Partial update
    let code = null;
    let i = 0;
    while (i < fieldstring.length) {
      let maybecode = partialCodeToFull(fieldstring[i]);
      if (maybecode !== null) {
        code = maybecode;
        i++;
      } else {
        let x = fieldstring.charCodeAt(i) - INDEX_CODE_BASE;
        let y = fieldstring.charCodeAt(i+1) - INDEX_CODE_BASE;
        cellUpdate(board, x, y, code);
        i += 2;
      }
    }
  } else {
    // Full update
    for (let x = 0; x < BOARD_WIDTH; x++) {
      for (let y = 0; y < BOARD_HEIGHT; y++) {
        let i = x*BOARD_WIDTH + y;
        cellUpdate(board, x, y, fieldstring[i])
      }
    }
  }
  state.requestDraw();
}

///////////////////////////
export function connectAndHandshake(
    username: string, onhandshake: (playerNum: number, sock: WebSocket) => void) {
  let s = 'tetrisstart ' + username + ' 1.13';
  let encoded = loginEncode(s);

  let sock: WebSocket;
  const process = (msg: MessageEvent) => {
    // initial handshake -- we get a player number and then report our team
    let cmd = msg.data.split(' ');
    if (cmd[0] == 'playernum') {
      let playerNum = parseInt(cmd[1]);
      // Now that we have our number, set our (dummy) team
      sock.send('team ' + playerNum + ' ');
      sock.onmessage = null;
      onhandshake(playerNum, sock);
    }
  };
  sock = connectProxy(() => {
    sock.onmessage = process;
    sock.send(encoded);
    console.log("sending ", encoded);
  });
}
//

export function processMessage(state: GameState, msg: MessageEvent) {
  console.log('RECV:', msg.data)
  let cmd = msg.data.split(' ');

  if (cmd[0] == 'f') {
    fieldUpdate(state, parseInt(cmd[1]), cmd[2]);
  }

}
