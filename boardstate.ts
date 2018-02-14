import { BOARD_WIDTH, BOARD_HEIGHT, INITIAL_X } from "consts";
import { draw_square, COLORS, randomColor, CLEARED_COLOR, draw_text } from "draw_util";
import { Shape, Piece, randomPiece } from "pieces";
import { randInt } from "util";
import { Special } from "specials";

export class Cell {
  color: number;
  special: typeof Special;

  constructor(color: number, special: typeof Special) {
    this.color = color;
    this.special = special;
  }

  draw = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = COLORS[this.color];
    draw_square(ctx, x, y);

    if (this.special !== undefined) {
      ctx.font = '30px Arial';
      ctx.fillStyle = 'rgb(0, 0, 0)';
      draw_text(ctx, x, y, this.special.identifier);
      console.log(this.special);
    }
  }

  clearSpecials = () => {
    this.special = undefined;
  }

}

export class BoardState {
  board: Cell[][];
  x: number;
  y: number;
  piece: Piece;
  orientation: number;
  color: number;
  serverIndex: number; // What number the server thinks this board is

  constructor(serverIndex: number) {
    this.board = new Array(BOARD_WIDTH);
    for (let i = 0; i < BOARD_WIDTH; i += 1) {
      this.board[i] = new Array(BOARD_HEIGHT);
    }

    this.serverIndex = serverIndex;
  }

  rotate = () => {
    const new_orientation = (this.orientation + 1) % this.piece.shapes.length;
    if (this.intersects(this.piece.shapes[new_orientation],
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
    return this.piece.shapes[this.orientation];
  }

  move = (dx: number, dy: number) => {
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
          draw_square(ctx, x, y);
        } else {
          this_square.draw(ctx, x, y);
        }
      }
    }

    if (this.piece !== undefined) {
      ctx.fillStyle = COLORS[this.color];
      this.piece.draw(ctx, this.x, this.y, this.orientation);
    }
  }

  removeLine = (lineNo: number): (typeof Special)[] => {
    let specials: (typeof Special)[] = [];
    for (; lineNo > 0; lineNo -= 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (this.board[x][lineNo] !== undefined &&
            this.board[x][lineNo].special !== undefined) {
          specials.push(this.board[x][lineNo].special);
        }
        this.board[x][lineNo] = this.board[x][lineNo - 1];
      }
    }

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      this.board[x][0] = undefined;
    }

    return specials;
  }

  removeLines = (): [number, (typeof Special)[]] => {
    let count = 0;
    let specials: (typeof Special)[] = [];

    for (let lineNo = 0; lineNo < BOARD_HEIGHT; lineNo += 1) {
      let found = false;
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        if (this.board[x][lineNo] === undefined) {
          found = true;
          break;
        }
      }

      if (!found) {
        const specials_removed = this.removeLine(lineNo);
        specials = specials.concat(specials_removed);
        count += 1;
      }
    }

    return [count, specials];
  }

  newPiece = (piece: Piece) => {
    this.x = INITIAL_X;
    this.y = 0;
    this.color = randomColor();
    this.piece = piece;
    this.orientation = randInt(this.piece.shapes.length);
  }

  freeze = () => {
    const shape = this.curShape();
    for (let coord of shape.coords) {
      this.board[coord[0] + this.x][coord[1] + this.y] = new Cell(this.color, undefined);
    }
  }
}
