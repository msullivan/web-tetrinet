import { BOARD_WIDTH, BOARD_HEIGHT } from "consts";
import { SPECIALS, Special, classicAddLines } from 'specials';
import { GameState, GameParams } from 'gamestate';
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

function formatFullUpdate(board: BoardState): string {
  let update = "";
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      let cell = board.board[x][y];
      let c: string;
      if (cell === undefined) {
        c = '0';
      } else if (cell.special !== undefined) {
        c = cell.special.identifier.toLowerCase();
      } else {
        c = cell.color.toString();
      }
      update += c;
    }
  }
  return update;
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
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        let i = y*BOARD_WIDTH + x;
        cellUpdate(board, x, y, fieldstring[i])
      }
    }
  }
  state.requestDraw();
}

function specialUsed(state: GameState,
                     target: number, typ: string, sender: number) {
  let special = special_map[typ];
  if (special !== undefined) {
    state.applySpecial(special, target, sender);
  }
  if (target == 0 && typ.startsWith("cs")) {
    // This is kind of ugly
    let cnt = parseInt(typ.substr(2));
    state.applySpecial(classicAddLines[cnt], 0, sender);
  }
}

export function parseGameRules(cmd: string[]): GameParams {
  // https://github.com/xale/iTetrinet/wiki/new-game-rules-string
  let parseFreqs = (s: string) => {
    let a = [];
    for (let c of s) {
      a.push(parseInt(c)-1);
    }
    return a;
  }

  let p = new GameParams();
  p.tetrifast = cmd[0] == "*******";
  p.startingHeight = parseInt(cmd[1]);
  p.startingLevel = parseInt(cmd[2]);
  p.linesPerLevel = parseInt(cmd[3]);
  p.levelIncrement = parseInt(cmd[4]);
  p.linesPerSpecial = parseInt(cmd[5]);
  p.specialsAdded = parseInt(cmd[6]);
  p.specialCapacity = parseInt(cmd[7]);
  p.pieceFrequencies = parseFreqs(cmd[8]);
  p.specialFrequencies = parseFreqs(cmd[9]);
  p.averageLevels = cmd[10] == '1';
  p.classicMode = cmd[11] == '1';

  return p;
}

function newGame(state: GameState, cmd: string[]) {
  state.params = parseGameRules(cmd);
  state.newGame();
  state.start();
}

function pauseGame(state: GameState, pause: number) {
  if (pause) {
    state.pause();
  } else {
    state.resume();
  }
}

///////////////////////////
// The proxy "protocol" has an extra round trip in it so the caller needs
// to set up its onmessage handler in its onopen handler.
function connectProxy(url: string, onopen: () => void): WebSocket {
  var sock = new WebSocket(url);
  sock.onopen = (event) => {
    sock.send("Hi!");
  };

  var ready = false;
  var num = 0;
  sock.onmessage = (event) => {
    sock.onmessage = undefined;
    onopen();
  };
  sock.onerror = (error) => {
    console.log("Hey there was an error");
  }
  sock.onclose = (error) => {
    console.log("Hey the socket closed");
  }
  return sock;
}

export function connectAndHandshake(
    url: string, username: string,
    onhandshake: (playerNum: number, sock: WebSocket) => void) {
  // TODO: try a tetrifast connection and fall back to tetrisstart if it fails
  let protocol = 'tetrifaster';

  let s = protocol + ' ' + username + ' 1.13';
  let encoded = loginEncode(s);

  let sock: WebSocket;
  const process = (msg: MessageEvent) => {
    // initial handshake -- we get a player number and then report our team
    let cmd = msg.data.split(' ');
    if (cmd[0] == 'playernum' || cmd[0] == ')#)(!@(*3') {
      let playerNum = parseInt(cmd[1]);
      // Now that we have our number, set our (dummy) team
      send(sock, ['team', playerNum, '']);
      sock.onmessage = null;
      onhandshake(playerNum, sock);
    }
  };
  sock = connectProxy(url, () => {
    sock.onmessage = process;
    send(sock, [encoded]);
  });
}
//

function send(sock: WebSocket, args: any[]) {
  let s = args.join(' ');
  console.log('SEND:', s);
  sock.send(s);
}

export class ProtocolManager {
  private sock: WebSocket;
  private num: number;
  constructor(sock: WebSocket, playerNum: number) {
    this.sock = sock;
    this.num = playerNum;
  }
  updatePlayerNum = (n: number) => { this.num = n; }
  private send = (args: any[]) => { send(this.sock, args); }

  sendFieldUpdate = (board: BoardState) => {
    // We always send a full update, since it is easy to compute and why not
    let update = formatFullUpdate(board);
    this.send(['f', this.num, update]);
  }

  sendSpecial = (target: number, special: string) => {
    this.send(['sb', target, special, this.num]);
  }

  sendPlayerLost = () => {
    this.send(['playerlost', this.num]);
  }
  sendStartStop = (startGame: boolean) => {
    let arg = startGame ? 1 : 0;
    this.send(['startgame', arg, this.num]);
  }

  sendPauseResume = (pauseGame: boolean) => {
    let arg = pauseGame ? 1 : 0;
    this.send(['pause', arg, this.num]);
  }

  sendChatMessage = (message: string) => {
    this.send(['pline', this.num, message]);
  }

  sendChatAction = (message: string) => {
    this.send(['plineact', this.num, message]);
  }

  sendIngameChatMessage = (message: string) => {
    this.send(['gmsg', message]);
  }
}

export function processMessage(state: GameState, msg: MessageEvent) {
  console.log('RECV:', msg.data)
  let cmd = msg.data.split(' ');

  if (cmd[0] == 'f') {
    fieldUpdate(state, parseInt(cmd[1]), cmd[2]);
  } else if (cmd[0] == 'sb') {
    specialUsed(state, parseInt(cmd[1]), cmd[2], parseInt(cmd[3]));
  } else if (cmd[0] == 'newgame' || cmd[0] == '*******') {
    newGame(state, cmd);
  } else if (cmd[0] == 'pause') {
    pauseGame(state, parseInt(cmd[1]));
  } else if (cmd[0] == 'endgame') {
    state.end();
  } else if (cmd[0] == 'ingame') {
    state.alreadyInGame();
  } else if (cmd[0] == 'playerjoin') {
    state.playerJoin(parseInt(cmd[1]), cmd[2]);
  } else if (cmd[0] == 'playerleave') {
    state.playerLeave(parseInt(cmd[1]));
  } else if (cmd[0] == 'playerwon') {
    state.playerWon(parseInt(cmd[1]));
  } else if (cmd[0] == 'playerlost') {
    state.playerLost(parseInt(cmd[1]));
  } else if (cmd[0] == 'playernum' || cmd[0] == ')#)(!@(*3') {
    state.changePlayerNum(parseInt(cmd[1]));
  } else if (cmd[0] == 'pline') {
    state.receiveChat(parseInt(cmd[1]), msg.data.substr(cmd[0].length + 1 + cmd[1].length + 1));
  } else if (cmd[0] == 'plineact') {
    state.receiveChatAct(parseInt(cmd[1]), msg.data.substr(cmd[0].length + 1 + cmd[1].length + 1));
  } else if (cmd[0] == 'gmsg') {
    state.receiveGameMessage(msg.data.substr(cmd[0].length + 1));
  }

}
