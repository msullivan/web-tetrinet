import { BoardState, Cell } from 'boardstate';
import { Special, AddLine, ClearLine, NukeField, RandomClear, SwitchField,
         ClearSpecials, Gravity, QuakeField, BlockBomb, randomSpecial } from 'specials';
import { Piece, randomPiece, cyclePiece } from 'pieces';
import { BOARD_HEIGHT, BOARD_WIDTH } from 'consts';
import { COLORS, randomColor, CLEARED_COLOR, draw_square } from 'draw_util';
import { randInt, escapeHtml } from 'util';
import { sendFieldUpdate, sendSpecial, sendStartStop, sendPlayerLost } from 'protocol';
import { MessagePane } from 'messagepane';

export class GameParams {
  // See https://github.com/xale/iTetrinet/wiki/new-game-rules-string
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

enum Status {
  Unstarted,
  Paused,
  Playing,
  Dead,
}

export class GameState {
  params: GameParams;

  status: Status;

  level: number;
  linesSinceLevel: number;
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
  otherBoardCanvas: HTMLCanvasElement[];
  sock: WebSocket;

  playerNames: string[];

  onUpdateSpecials: (x: typeof Special) => void;

  constructor(myIndex: number,
              username: string,
              sock: WebSocket,
              myBoardCanvas: HTMLCanvasElement,
              nextPieceCanvas: HTMLCanvasElement,
              specialsCanvas: HTMLCanvasElement,
              otherBoardCanvas: HTMLCanvasElement[],
              messagePane: MessagePane,
              onUpdateSpecials: (x: typeof Special) => void,
              params: GameParams) {
    this.pendingDraw = false;

    this.playerNames = [];
    this.myIndex = myIndex;
    this.username = username;
    this.playerNames[myIndex] = username;

    this.resetGame();

    this.sock = sock;
    this.myBoardCanvas = myBoardCanvas;
    this.otherBoardCanvas = otherBoardCanvas;
    this.nextPieceCanvas = nextPieceCanvas;
    this.specialsCanvas = specialsCanvas;
    this.messagePane = messagePane;

    this.params = params;

    this.specials = [];

    this.onUpdateSpecials = onUpdateSpecials;

  }

  playing = (): boolean => { return this.status == Status.Playing }

  playerBoard = (n: number): BoardState => {
    return this.boards[n-1];
  }

  myBoard = (): BoardState => {
    return this.playerBoard(this.myIndex);
  }

  // Reset the game to a "Unstarted" state
  resetGame = () => {
    console.log("YOOOOO");
    this.status = Status.Unstarted;

    this.tickTime = 1000;
    this.level = 0;
    this.linesSinceLevel = 0;
    this.linesSinceSpecial = 0;
    this.specials = [];

    this.boards = [];
    for (let i = 0; i < 6; i += 1) {
      this.boards.push(new BoardState(i));
    }

    this.nextPiece = undefined;
  }

  newGame = () => {
    this.resetGame();

    this.nextPiece = randomPiece();
    this.nextOrientation = this.nextPiece.randomOrientation();

    this.myBoard().newPiece(randomPiece(), 0);
  }

  newPiece = () => {
    if (!this.myBoard().newPiece(this.nextPiece, this.nextOrientation)) {
      return this.die();
    }
    this.nextPiece = randomPiece();
    this.nextOrientation = this.nextPiece.randomOrientation();
  }

  // Clear any running actions
  halt = () => {
    clearTimeout(this.timeoutID);
  }

  start = () => {
    this.halt();
    this.timeoutID = setTimeout(this.tick, this.tickTime);
    this.status = Status.Playing;
    this.messagePane.clearMessages();
    this.message("The game has <b>started<b>.");
    this.requestDraw();
  }

  resume = () => {
    this.start();
    this.message("The game has <b>resumed<b>.");
  }

  pause = () => {
    this.halt();
    this.status = Status.Paused;
    this.message("The game has <b>paused<b>.");
  }

  end = () => {
    this.halt();
    this.resetGame();
    this.message("The game has <b>ended<b>.");
    this.requestDraw();
  }

  private die = () => {
    this.halt();
    this.status = Status.Dead;
    this.message("<b>You have lost!</b>");
    this.myBoard().deathFill();
    sendFieldUpdate(this.sock, this.myIndex, this.myBoard());
    sendPlayerLost(this.sock, this.myIndex);
    this.requestDraw();
  }

  private resetTimeout = () => {
    clearTimeout(this.timeoutID);
    this.timeoutID = setTimeout(this.tick, this.tickTime);
  }

  // Player state management
  playerName = (num: number): string => {
    return escapeHtml(this.playerNames[num]);
  }
  playerJoin = (num: number, name: string) => {
    this.playerNames[num] = name;
  }
  playerLeave = (num: number) => {
    this.playerNames[num] = undefined;
  }
  playerWon = (num: number) => {
    this.message("Player " + this.playerName(num) + " has won!");
  }
  playerLost = (num: number) => {
    this.message("Player " + this.playerName(num) + " has lost!");
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
  }

  private draw = () => {
    for (let i = 1; i <= this.boards.length; i++) {
      this.drawBoard(this.playerNumToCanvas(i), this.playerBoard(i));
    }
    this.drawPreview(this.nextPieceCanvas);
    this.drawSpecials(this.specialsCanvas);

    if (this.onUpdateSpecials !== undefined) {
      this.onUpdateSpecials(this.specials[0]);
    }

    this.pendingDraw = false;
  }

  private message = (msg: string) => {
    this.messagePane.addMessage(msg);
    console.log("MSG: ", msg);
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

    sendFieldUpdate(this.sock, this.myIndex, this.myBoard());
    if (linesRemoved > 1 && this.params.classicMode) {
      let num = linesRemoved == 4 ? 4 : linesRemoved-1;
      sendSpecial(this.sock, this.myIndex, 0, 'cs'+num);
    }

    if (specialsToAdd > 0) {
      this.addSpecials(specialsToAdd);
      // Rarely, a new line can be created by adding specials.
      this.removeLines();
    }
  }

  private sendSpecial = (playerNum: number) => {
    if (playerNum === 0 || playerNum > 6) { return; }
    if (this.specials.length === 0) { return; }

    let serverNum;
    if (playerNum === 1) {
      serverNum = this.myIndex;
    } else {
      if (playerNum > this.myIndex) {
        serverNum = playerNum;
      } else {
        serverNum = playerNum - 1;
      }
    }

    let special = this.specials.shift();

    sendSpecial(this.sock, this.myIndex, serverNum,
                special.identifier.toLowerCase());

    if (playerNum === 1) {
      // We're applying the special to ourselves. The server doesn't echo it, so we need
      // to apply it here.
      special.apply(this, this.myIndex);
    } else if (special === SwitchField) {
      // If we switch fields with someone else, we need to apply the change to our board too.
      // It's symmetric, so we can pretend it was the other player applying it to us.
      special.apply(this, serverNum);
    }
  }

  private freeze = () => {
    this.myBoard().freeze();
    this.removeLines();
  }

  applySpecial = (special: typeof Special, fromPlayer: number) => {
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

    if (this.debugMode && event.key == 's') {
      if (this.playing()) this.pause();
      this.newGame();
      this.start();
    }
    if (this.status == Status.Unstarted) {
      if (event.key === 'p') {
        sendStartStop(this.sock, this.myIndex, true);
      }
      return;
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
        this.applySpecial(AddLine, 0);
      } else if (event.key === 'c') {
        this.applySpecial(ClearLine, 0);
      } else if (event.key === 'g') {
        this.applySpecial(Gravity, 0);
      } else if (event.key === 'q') {
        this.applySpecial(QuakeField, 0);
      } else if (event.key === 'n') {
        this.applySpecial(NukeField, 0);
      } else if (event.key === 'r') {
        this.applySpecial(RandomClear, 0);
      } else if (event.key === 'o') {
        this.applySpecial(BlockBomb, 0);
      } else if (event.key === 'b') {
        this.applySpecial(ClearSpecials, 0);
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
}
