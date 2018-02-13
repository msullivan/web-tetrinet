import { BoardState } from 'boardstate';
import { Special } from 'specials';
import { Piece, randomPiece } from 'pieces';
import { sizeCanvasForBoard } from 'draw_util';

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

  // TODO: context for specials area, and anything else we need.
  myBoardCanvas: HTMLCanvasElement;
  nextPieceCanvas: HTMLCanvasElement;
  otherBoardCanvas: HTMLCanvasElement[];

  constructor(myIndex: number,
              myBoardCanvas: HTMLCanvasElement,
              nextPieceCanvas: HTMLCanvasElement,
              otherBoardCanvas: HTMLCanvasElement[]) {
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

    sizeCanvasForBoard(myBoardCanvas);
    this.myBoardCanvas = myBoardCanvas;

    // TODO:
    //this.nextPieceCtx = nextPieceCtx;
    //this.otherBoardCtx = otherBoardCtx;
  }

  myBoard = (): BoardState => {
    return this.boards[this.myIndex];
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

  private draw = () => {
    const ctx = this.myBoardCanvas.getContext('2d', { alpha: false });

    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, this.myBoardCanvas.width, this.myBoardCanvas.height);

    this.myBoard().draw(ctx);

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

  private freeze = () => {
    this.myBoard().freeze();
    const linesRemoved = this.myBoard().removeLines();
    // TODO: deal with effects of line removals.
  }

  onKeyDown = (event: any) => {
    let state = this.myBoard();

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
    }

    this.requestDraw();
  }
}
