import { BOARD_WIDTH, BOARD_HEIGHT, INITIAL_X } from "consts";
import { square, COLORS, randomColor, CLEARED_COLOR } from "draw_util";
import { Shape, PIECES } from "pieces";
import { randInt } from "util";

export class State {
  board: number[][];
  x: number;
  y: number;
  piece: number;
  orientation: number;
  color: number;
  timeoutID: number;
  tickTime: number;

  constructor() {
    this.board = new Array(BOARD_WIDTH);
    for (let i = 0; i < BOARD_WIDTH; i += 1) {
      this.board[i] = new Array(BOARD_HEIGHT);
    }

    console.log(this.board);

    this.piece = 3;
    this.orientation = 0;
    this.x = INITIAL_X;
    this.y = 0;
    this.color = 4;
    this.tickTime = 1000;
  }

  rotate = () => {
    const new_orientation = (this.orientation + 1) % PIECES[this.piece].shapes.length;
    if (this.intersects(PIECES[this.piece].shapes[new_orientation],
                        this.x, this.y)) {
      return;
    } else {
      this.orientation = new_orientation;
    }
  }

  intersects = (shape: Shape, x: number, y: number) => {
    for (let coord of shape.coords) {
      let new_x: number = coord[0] + x;
      let new_y: number = coord[1] + y;

      if (this.board[new_x] === undefined ||
          this.board[new_x][new_y] !== undefined ||
          new_y >= BOARD_HEIGHT ||
          new_x < 0 ||
          new_x >= BOARD_WIDTH) {
        return true;
      }
    }

    return false;
  }

  curShape = () => {
    // TODO: store piece object instead?
    return PIECES[this.piece].shapes[this.orientation];
  }

  move = (dx, dy) => {
    let new_x = this.x + dx;
    let new_y = this.y + dy;
    let shape = this.curShape();

    if (this.intersects(this.curShape(), new_x, new_y)) {
      return false;
    } else {
      this.x = new_x;
      this.y = new_y;
      return true;
    }
  }

  drop = () => {
    while (this.move(0, 1)) {}
  }

  draw = (ctx: CanvasRenderingContext2D) => {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        const this_square = this.board[x][y];
        if (this_square === undefined) {
            ctx.fillStyle = CLEARED_COLOR;
        } else {
          ctx.fillStyle = COLORS[this_square];
        }
        square(ctx, x, y);
      }
    }

    ctx.fillStyle = COLORS[this.color];
    PIECES[this.piece].draw(ctx, this.x, this.y, this.orientation);
  }

  removeLines = () => {
    const removeLine = (lineNo) => {
      for (; lineNo > 0; lineNo -= 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          this.board[x][lineNo] = this.board[x][lineNo - 1];
        }
      }

      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        this.board[x][0] = undefined;
      }
    };

    for (let lineNo = 0; lineNo < BOARD_HEIGHT; lineNo += 1) {
      let found = false;
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (this.board[x][lineNo] === undefined) {
          found = true;
          break;
        }
      }

      if (!found) { removeLine(lineNo); }
    }
  }

  freeze = () => {
    const shape = this.curShape();
    for (let coord of shape.coords) {
      this.board[coord[0] + this.x][coord[1] + this.y] = this.color;
    }

    this.removeLines();

    this.x = INITIAL_X;
    this.y = 0;
    this.color = randomColor();
    this.piece = randInt(PIECES.length); //randomPiece(); TODO
    this.orientation = randInt(PIECES[this.piece].shapes.length);
  }
}
