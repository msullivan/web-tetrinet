import { BoardState, Cell } from 'boardstate';
import { Special, AddLine, ClearLine, NukeField, RandomClear, SwitchField,
         ClearSpecials, Gravity, QuakeField, BlockBomb,
         randomSpecial, classicAddLines } from 'specials';
import { Piece, randomPiece, cyclePiece } from 'pieces';
import { BOARD_HEIGHT, BOARD_WIDTH } from 'consts';
import { COLORS, randomColor, CLEARED_COLOR, draw_square } from 'draw_util';
import { randInt, escapeHtml, $ } from 'util';
import { ProtocolManager, parseGameRules } from 'protocol';
import { MessagePane } from 'messagepane';

export class GameParams {
  // See https://github.com/xale/iTetrinet/wiki/new-game-rules-string
  tetrifast: boolean;

  startingHeight: number;

  startingLevel: number;
  linesPerLevel: number;
  levelIncrement: number;
  linesPerSpecial: number;
  specialsAdded: number;
  specialCapacity: number;

  pieceFrequencies: number[];
  specialFrequencies: number[];

  averageLevels: boolean;
  classicMode: boolean;
}
// The params that get used for local testing in debug mode.
const defaultParams = parseGameRules("******* 0 1 2 1 1 1 18 \
3333333333333355555555555555222222222222222444444444444446666666666666677777777777777111111111111111\
 1111111111111111111111111111111122222222222222222234444444444455566666666666666788888899999999999999 \
1 1".split(" "));

enum Status {
  Unstarted,
  Paused,
  Playing,
  Dead,
}

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a'
];

export class GameState {
  params: GameParams;

  status: Status;

  level: number;
  linesRemoved: number;
  linesSinceSpecial: number;

  specials: (typeof Special)[];

  timeoutID: number;
  tickTime: number;

  myIndex: number;
  username: string;
  boards: BoardState[];

  pendingDraw: boolean;

  nextPiece: Piece;
  nextOrientation: number;

  debugMode: boolean;

  myBoardCanvas: HTMLCanvasElement;
  nextPieceCanvas: HTMLCanvasElement;
  specialsCanvas: HTMLCanvasElement;
  messagePane: MessagePane;
  chatPane: MessagePane;
  otherBoardCanvas: HTMLCanvasElement[];
  proto: ProtocolManager;

  playerNames: string[];

  activePlayers: boolean[];

  nextCodeIdx: number;

  constructor(myIndex: number,
              username: string,
              sock: WebSocket,
              myBoardCanvas: HTMLCanvasElement,
              nextPieceCanvas: HTMLCanvasElement,
              specialsCanvas: HTMLCanvasElement,
              otherBoardCanvas: HTMLCanvasElement[],
              messagePane: MessagePane,
              chatPane: MessagePane) {
    this.pendingDraw = false;

    this.playerNames = [];
    this.myIndex = myIndex;
    this.username = username;
    this.playerNames[myIndex] = username;

    this.resetGame();

    this.myBoardCanvas = myBoardCanvas;
    this.otherBoardCanvas = otherBoardCanvas;
    this.nextPieceCanvas = nextPieceCanvas;
    this.specialsCanvas = specialsCanvas;
    this.messagePane = messagePane;
    this.chatPane = chatPane;

    this.params = defaultParams;

    this.proto = new ProtocolManager(sock, myIndex);

    this.specials = [];
    this.activePlayers = [];

    this.nextCodeIdx = 0;
  }

  playing = (): boolean => { return this.status == Status.Playing }

  playerBoard = (n: number): BoardState => {
    return this.boards[n-1];
  }

  myBoard = (): BoardState => {
    return this.playerBoard(this.myIndex);
  }

  updateLevel = () => {
    if (this.params === undefined) { return; }
    const level = Math.floor(this.linesRemoved / this.params.linesPerLevel) *
          this.params.levelIncrement +
          this.params.startingLevel;
    $('level-display').innerText = level.toString();
    this.tickTime = Math.max(1005 - level * 10);
  }

  // Reset the game to a "Unstarted" state
  resetGame = () => {
    this.status = Status.Unstarted;

    this.tickTime = 1005;
    this.level = 0;
    this.linesRemoved = 0;
    this.linesSinceSpecial = 0;
    this.specials = [];
    this.activePlayers = [];

    this.updateLabels();

    this.boards = [];
    for (let i = 0; i < 6; i += 1) {
      this.boards.push(new BoardState(i));
    }

    this.nextPiece = undefined;

    this.updateLevel();
  }

  newGame = () => {
    this.resetGame();

    this.nextPiece = randomPiece(this.params.pieceFrequencies);
    this.nextOrientation = this.nextPiece.randomOrientation();

    this.myBoard().newPiece(randomPiece(this.params.pieceFrequencies), 0);
  }

  newPiece = () => {
    if (!this.myBoard().newPiece(this.nextPiece, this.nextOrientation)) {
      return this.die();
    }
    this.nextPiece = randomPiece(this.params.pieceFrequencies);
    this.nextOrientation = this.nextPiece.randomOrientation();
  }

  // Clear any running actions
  private go = () => {
    this.timeoutID = setTimeout(this.tick, this.tickTime);
    this.status = Status.Playing;
    this.requestDraw();
  }

  private halt = () => {
    clearTimeout(this.timeoutID);
  }

  start = () => {
    this.halt();
    for (let i = 0; i < 6; i += 1) {
      if (this.playerNames[i] !== undefined) {
        this.activePlayers[i] = true;
      }
    }
    this.updateLabels();
    $('ingame').classList.remove('hidden');
    $('lobby').classList.add('hidden');
    this.messagePane.clearMessages();
    this.message("The game has <b>started<b>.");
    this.chatMessage("<b>*** The game has started</b>");
    this.go();
  }

  resume = () => {
    this.message("The game has <b>resumed<b>.");
    this.go();
  }

  pause = () => {
    this.halt();
    this.status = Status.Paused;
    this.message("The game has <b>paused<b>.");
  }

  end = () => {
    $('ingame').classList.add('hidden');
    $('lobby').classList.remove('hidden');
    $('chat-input').focus();
    this.halt();
    this.resetGame();
    this.message("The game has <b>ended<b>.");
    this.chatMessage("<b>*** The game has ended</b>");
    this.requestDraw();
  }

  private die = () => {
    this.halt();
    this.status = Status.Dead;
    this.message("<b>You have lost!</b>");
    this.myBoard().deathFill();
    this.proto.sendFieldUpdate(this.myBoard());
    this.proto.sendPlayerLost();
    this.requestDraw();
  }

  private resetTimeout = () => {
    clearTimeout(this.timeoutID);
    this.timeoutID = setTimeout(this.tick, this.tickTime);
  }

  private updateLabels = () => {
    for (let i = 1; i <= 6; i += 1) {
      const localId = this.serverToLocalNumber(i);
      if (localId === 1) { continue; }
      const nameElement = $('playername-'+localId);
      const labelElement = $('label-'+localId);
      const chatLabelElement = $('playerlist-'+i); // uses server index.
      if (this.playerNames[i] === undefined) {
        nameElement.innerHTML = '';
        chatLabelElement.innerHTML = '';
        labelElement.classList.add('inactive-player');
      } else {
        nameElement.innerText = this.playerNames[i];
        chatLabelElement.innerHTML = this.playerNames[i];
        if (this.activePlayers[i]) {
          labelElement.classList.remove('inactive-player');
        } else {
          labelElement.classList.add('inactive-player');
        }
      }
    }

    const myChatLabel = $('playerlist-'+this.myIndex);
    myChatLabel.innerText = this.playerNames[this.myIndex];
  }

  // Player state management
  playerName = (num: number): string => {
    return escapeHtml(this.playerNames[num]);
  }
  playerJoin = (num: number, name: string) => {
    this.playerNames[num] = name;
    this.chatMessage("<b>*** " + escapeHtml(name) + "</b> has joined the game");
    this.updateLabels();
  }
  playerLeave = (num: number) => {
    this.chatMessage("<b>*** " + escapeHtml(this.playerNames[num]) + "</b> has left the game");
    this.playerNames[num] = undefined;
    this.updateLabels();
  }
  playerWon = (num: number) => {
    this.message("Player " + this.playerName(num) + " has won!");
    for (let i = 0; i < 6; i += 1) {
      this.activePlayers[num] = false;
    }
    this.updateLabels();
  }
  playerLost = (num: number) => {
    this.message("Player " + this.playerName(num) + " has lost!");
    this.activePlayers[num] = false;
    this.updateLabels();
  }
  changePlayerNum = (num: number) => {
    this.playerNames[num] = this.playerNames[this.myIndex];
    this.activePlayers[num] = this.activePlayers[this.myIndex];

    this.playerNames[this.myIndex] = undefined;
    this.activePlayers[this.myIndex] = undefined;

    this.myIndex = num;
    this.proto.updatePlayerNum(num);
    this.updateLabels();
  }

  //
  requestDraw = () => {
    if (this.pendingDraw) { return; }
    this.pendingDraw = true;
    requestAnimationFrame(this.draw);
  }

  private playerNumToCanvas(i: number): HTMLCanvasElement {
    if (i < this.myIndex) {
      return this.otherBoardCanvas[i-1];
    } else if (i == this.myIndex) {
      return this.myBoardCanvas;
    } else {
      return this.otherBoardCanvas[i-2];
    }
  }

  private drawBoard = (canvas: HTMLCanvasElement, board: BoardState) => {
    const ctx = canvas.getContext('2d', { alpha: false });

    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    board.draw(ctx);
  }

  private drawPreview = (canvas: HTMLCanvasElement) => {
    let ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = CLEARED_COLOR;
    for (let x = 0; x < 6; x += 1) {
      for (let y = 0; y < 6; y += 1) {
        draw_square(ctx, x, y);
      }
    }
    if (this.nextPiece) {
      this.nextPiece.draw(ctx, 3, 2, this.nextOrientation);
    }
  }

  private drawSpecials = (canvas: HTMLCanvasElement) => {
    let ctx = canvas.getContext('2d', { alpha: false });

    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = CLEARED_COLOR;
    for (let x = 0; x < 30; x += 1) {
      draw_square(ctx, x, 0);
    }

    for (let i = 0; i < this.specials.length; i += 1) {
      new Cell(0, this.specials[i]).draw(ctx, i, 0);
    }

    let elem = $('specials-caption');
    if (this.specials[0] !== undefined) {
      elem.innerHTML = this.specials[0].desc;
    } else {
      elem.innerHTML = '';
    }
  }

  private draw = () => {
    for (let i = 1; i <= this.boards.length; i++) {
      this.drawBoard(this.playerNumToCanvas(i), this.playerBoard(i));
    }
    this.drawPreview(this.nextPieceCanvas);
    this.drawSpecials(this.specialsCanvas);

    this.pendingDraw = false;
  }

  private message = (msg: string) => {
    this.messagePane.addMessage(msg);
    console.log("MSG: ", msg);
  }

  private chatMessage = (msg: string) => {
    const d = new Date();
    function pad(n: number) {
      return ('0' + n.toString()).substr(-2);
    }
    const ts = '<font color="grey">[' + pad(d.getHours()) + ':' +
          pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ']</font>';
    this.chatPane.addMessage(ts + ' ' + msg);
  }

  private tick = () => {
    if (!this.playing()) return;
    let state = this.myBoard();

    if (!state.move(0, 1)) {
      this.freeze();
      this.newPiece();
    }

    this.timeoutID = setTimeout(this.tick, this.tickTime);

    this.requestDraw();
  }

  private addSpecials = (num: number) => {
    const board = this.myBoard();

    let blockCount = 0;
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        if (board.board[x][y] !== undefined &&
            board.board[x][y].special === undefined) {
          blockCount += 1;
        }
      }
    }

    while (blockCount > 0 && num > 0) {
      let idx = randInt(blockCount);
      let done = false;

      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        for (let y = 0; y < BOARD_HEIGHT; y += 1) {
          if (board.board[x][y] !== undefined &&
              board.board[x][y].special === undefined) {
            if (idx == 0) {
              board.board[x][y].special = randomSpecial(this.params.specialFrequencies);
              done = true;
              break;
            } else {
              idx -= 1;
            }
          }
        }
        if (done) { break; }
      }

      blockCount -= 1;
      num -= 1;
    }

    while (num > 0) {
      // This is silly, but it's what tetrinet does...

      let found = false;
      for (let i = 0; i < 20; i += 1) {
        const column = randInt(BOARD_WIDTH);
        let isEmpty = true;
        for (let y = 0; y < BOARD_HEIGHT; y += 1) {
          if (board.board[column][y] !== undefined) {
            isEmpty = false;
            break;
          }
        }

        if (isEmpty) {
          board.board[column][BOARD_HEIGHT - 1] = new Cell(
            randomColor(),
            randomSpecial(this.params.specialFrequencies)
          );
          num -= 1;
          found = true;
          break;
        }
      }

      if (!found) { break; }
    }
  }

  private removeLines = () => {
    const [linesRemoved, specialsRemoved] = this.myBoard().removeLines();

    this.linesSinceSpecial += linesRemoved;
    this.linesRemoved += linesRemoved;

    const specialsToAdd = Math.floor(this.linesSinceSpecial / this.params.linesPerSpecial) *
          this.params.specialsAdded;
    this.linesSinceSpecial %= this.params.linesPerSpecial;

    for (let special of specialsRemoved) {
      if (this.specials.length >= this.params.specialCapacity) { break; }
      for (let i = 0; i < linesRemoved; i += 1) {
        if (this.specials.length >= this.params.specialCapacity) { break; }
        this.specials.push(special);
      }
    }

    this.proto.sendFieldUpdate(this.myBoard());
    if (linesRemoved > 1 && this.params.classicMode) {
      let num = linesRemoved == 4 ? 4 : linesRemoved-1;
      this.specialMessage(classicAddLines[num], 0, this.myIndex);
      this.proto.sendSpecial(0, 'cs'+num);
    }

    if (specialsToAdd > 0) {
      this.addSpecials(specialsToAdd);
      // Rarely, a new line can be created by adding specials.
      this.removeLines();
    }

    this.updateLevel();
  }

  private localToServerNumber = (playerNum: number) => {
    if (playerNum === 1) {
      return this.myIndex;
    } else {
      if (playerNum > this.myIndex) {
        return playerNum;
      } else {
        return playerNum - 1;
      }
    }
  }

  private serverToLocalNumber = (serverNum: number) => {
    if (serverNum === this.myIndex) {
      return 1;
    } else if (serverNum < this.myIndex) {
      return serverNum + 1;
    } else {
      return serverNum;
    }
  }

  private sendSpecial = (playerNum: number) => {
    if (playerNum === 0 || playerNum > 6) { return; }
    if (this.specials.length === 0) { return; }

    let serverNum = this.localToServerNumber(playerNum);
    if (!this.activePlayers[serverNum]) { return; }

    let special = this.specials.shift();

    this.specialMessage(special, serverNum, this.myIndex);
    this.proto.sendSpecial(serverNum, special.identifier.toLowerCase());

    if (playerNum === 1) {
      // We're applying the special to ourselves. The server doesn't
      // echo it, so we need to apply it here.
      special.apply(this, this.myIndex);
    } else if (special === SwitchField) {
      // If we switch fields with someone else, we need to apply the
      // change to our board too.  It's symmetric, so we can pretend
      // it was the other player applying it to us.
      special.apply(this, serverNum);
    }

    this.proto.sendFieldUpdate(this.myBoard());
  }

  private freeze = () => {
    this.myBoard().freeze();
    this.removeLines();
  }

  specialMessage = (special: typeof Special, target: number, fromPlayer: number) => {
    if (target == -1) return;
    let name = target == 0 ? "All" : this.playerName(target);
    this.message("<b>"+this.playerName(fromPlayer)+"</b> used " +
                 special.desc + " on " + name);
  }

  applySpecial = (special: typeof Special, target: number, fromPlayer: number) => {
    this.specialMessage(special, target, fromPlayer);

    if (target > 0 && target != this.myIndex) return;

    special.apply(this, fromPlayer);

    if (!this.myBoard().move(0, 0)) {
      this.freeze();
      this.newPiece();
    }

    this.removeLines();
    this.requestDraw();
  }

  onKeyDown = (event: any) => {
    let state = this.myBoard();

    if (!this.debugMode && event.key == KONAMI_CODE[this.nextCodeIdx]) {
      this.nextCodeIdx++;
      if (this.nextCodeIdx == KONAMI_CODE.length) return this.enableDebugMode();
    } else {
      this.nextCodeIdx = 0;
    }

    if (!this.playing()) return;

    let action = true;
    if (event.key === 'ArrowUp') {
      state.rotate();
    } else if (event.key === 'ArrowLeft') {
      state.move(-1, 0);
    } else if (event.key === 'ArrowRight') {
      state.move(1, 0);
    } else if (event.key === 'ArrowDown') {
      if (!state.move(0, 1)) {
        this.freeze();
        this.newPiece();
      }
      this.resetTimeout();
    } else if (event.key === ' ') {
      state.drop();
      this.freeze();
      this.newPiece();
      this.resetTimeout();
    } else if (event.key === 'd') {
      this.specials.shift();
      this.requestDraw();
    } else if (!isNaN(event.key)) {
      let num = parseInt(event.key);
      this.sendSpecial(num);
    } else if (this.debugMode) {
      if (event.key === 'a') {
        this.applySpecial(AddLine, -1, 0);
      } else if (event.key === 'c') {
        this.applySpecial(ClearLine, -1, 0);
      } else if (event.key === 'g') {
        this.applySpecial(Gravity, -1, 0);
      } else if (event.key === 'q') {
        this.applySpecial(QuakeField, -1, 0);
      } else if (event.key === 'n') {
        this.applySpecial(NukeField, -1, 0);
      } else if (event.key === 'r') {
        this.applySpecial(RandomClear, -1, 0);
      } else if (event.key === 'o') {
        this.applySpecial(BlockBomb, -1, 0);
      } else if (event.key === 'b') {
        this.applySpecial(ClearSpecials, -1, 0);
      } else if (event.key === 'i') {
        this.nextPiece = cyclePiece(this.nextPiece);
      } else {
        action = false;
      }
    } else {
      action = false;
    }

    if (action && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
    }
    this.requestDraw();
  }

  private formatChatMessage = (str: string) => {
    str = escapeHtml(str);
    str = str.replace(/\x04/g, '<font color="black">');
    str = str.replace(/\x05/g, '<font color="brightblue">');
    str = str.replace(/\x06/g, '<font color="grey">');
    str = str.replace(/\x08/g, '<font color="magenta">');
    str = str.replace(/\x0C/g, '<font color="darkgreen">');
    str = str.replace(/\x0E/g, '<font color="brightgreen">');
    // TODO: some more colors...
    str = str.replace(/\x14/g, '<font color="brightred">');

    return str;
  }

  receiveChat = (from: number, message: string) => {
    if (from === 0) {
      // Server message
      this.chatMessage("<b>***</b> "
                       + this.formatChatMessage(message));

    } else {
      const playerName = this.playerName(from);
      this.chatMessage("<b>&lt;" + playerName + "&gt;</b> "
                       + this.formatChatMessage(message));
    }
  }

  private enableDebugMode = () => {
    $('debug-start-box').classList.remove('hidden');
    this.debugMode = true;
    this.sendChatMessage("*** DEBUG MODE ENABLED ***");
    this.message("<b>*** DEBUG MODE ENABLED ***</b>");
  }

  private sendChatMessage(msg: string) {
    this.proto.sendChatMessage(msg);
    if (msg[0] !== '/') {
      this.receiveChat(this.myIndex, msg);
    }
  }

  onChatKey = (event: any) => {
    if (event.keyCode === 13) {
      let element = $('chat-input') as HTMLInputElement;
      let msg = element.value;
      element.value = '';
      if (msg == '/xyzzy') return this.enableDebugMode();
      this.sendChatMessage(msg);
    }
  }

  onPauseClick = (event: any) => {
    // TODO: check that we are the op?
    if (this.status == Status.Playing) {
      this.proto.sendPauseResume(true);
    } else if (this.status == Status.Paused) {
      this.proto.sendPauseResume(false);
    }
  }
  onStartClick = (event: any) => {
    // TODO: check that we are the op?
    if (this.status == Status.Unstarted) {
      this.proto.sendStartStop(true);
    }
  }
  onEndClick = (event: any) => {
    // TODO: check that we are the op?
    this.proto.sendStartStop(false);
  }
  onDebugStartClick = (event: any) => {
    if (!this.debugMode) return
    this.halt();
    this.newGame();
    this.start();
  }
}
