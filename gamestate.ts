import { BoardState, Cell } from 'boardstate';
import { Special, AddLine, ClearLine, NukeField, RandomClear, SwitchField,
         ClearSpecials, Gravity, QuakeField, BlockBomb, randomSpecial } from 'specials';
import { Piece, randomPiece } from 'pieces';
import { BOARD_HEIGHT, BOARD_WIDTH } from 'consts';
import { randomColor } from 'draw_util';
import { randInt } from 'util';

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

export class GameState {
  params: GameParams;

  level: number;
  linesSinceLevel: number;
  linesSinceSpecial: number;

  specials: Special[];

  timeoutID: number;
  tickTime: number;

  myIndex: number;
  boards: BoardState[];

  pendingDraw: boolean;

  nextPiece: Piece;

  debugMode: boolean;

  // TODO: context for specials area, and anything else we need.
  myBoardCanvas: HTMLCanvasElement;
  nextPieceCanvas: HTMLCanvasElement;
  otherBoardCanvas: HTMLCanvasElement[];

  constructor(myIndex: number,
              myBoardCanvas: HTMLCanvasElement,
              nextPieceCanvas: HTMLCanvasElement,
              otherBoardCanvas: HTMLCanvasElement[],
              params: GameParams) {
    this.tickTime = 1000;
    this.level = 0;
    this.linesSinceLevel = 0;
    this.linesSinceSpecial = 0;
    this.pendingDraw = false;

    this.boards = [];
    for (let i = 0; i < 6; i += 1) {
      this.boards.push(new BoardState(i));
    }

    this.myIndex = myIndex;
    this.nextPiece = randomPiece();

    this.myBoard().newPiece(randomPiece());

    this.myBoardCanvas = myBoardCanvas;
    this.otherBoardCanvas = otherBoardCanvas;

    this.params = params;

    this.specials = [];

    // TODO:
    //this.nextPieceCtx = nextPieceCtx;
    //this.otherBoardCtx = otherBoardCtx;
  }

  playerBoard = (n: number): BoardState => {
    return this.boards[n-1];
  }

  myBoard = (): BoardState => {
    return this.playerBoard(this.myIndex);
  }

  newPiece = () => {
    this.myBoard().newPiece(this.nextPiece);
    this.nextPiece = randomPiece();
  }

  start = () => {
    this.timeoutID = setTimeout(this.tick, this.tickTime);
    this.requestDraw();
  }

  private resetTimeout = () => {
    clearTimeout(this.timeoutID);
    this.timeoutID = setTimeout(this.tick, this.tickTime);
  }

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

  private draw = () => {
    for (let i = 1; i <= this.boards.length; i++) {
      this.drawBoard(this.playerNumToCanvas(i), this.playerBoard(i));
    }

    this.pendingDraw = false;
  }

  private tick = () => {
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

    this.addSpecials(specialsToAdd);

    for (let special of specialsRemoved) {
      if (this.specials.length >= this.params.specialCapacity) { break; }
      for (let i = 0; i < linesRemoved; i += 1) {
        if (this.specials.length >= this.params.specialCapacity) { break; }
        this.specials.push(special);
      }
    }

    // TODO: tell the server we removed lines.
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
  }

  onKeyDown = (event: any) => {
    let state = this.myBoard();

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
