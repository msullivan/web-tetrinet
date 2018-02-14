import { draw_square, COLORS } from 'draw_util';
import { randInt } from 'util';

export class Shape {
  coords: number[][];

  constructor(coords: number[][]) {
    this.coords = coords;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    for (let coord of this.coords) {
      draw_square(ctx, coord[0] + x, coord[1] + y);
    }
  }
}

export class Piece {
  shapes: Shape[];
  color: number;

  constructor(shapes: Shape[], color: number) {
    this.shapes = shapes;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, orientation: number) {
    const shape = this.shapes[orientation % this.shapes.length];
    ctx.fillStyle = COLORS[this.color];
    shape.draw(ctx, x, y);
  }

  randomOrientation = () => {
    return randInt(this.shapes.length);
  }
}

// https://tetris.wiki/TetriNet_Rotation_System
export const PIECES = [
  // 4x1
  new Piece([
    new Shape([[-2, 0], [-1, 0], [0, 0], [1, 0]]),
    new Shape([[0, 0], [0, 1], [0, 2], [0, 3]]),
  ], 1),
  // 2x2
  new Piece([
    new Shape([[0, 0], [0, 1], [1, 0], [1, 1]]),
  ], 2),
  // J
  new Piece([
    new Shape([[-1, 0], [-1, 1], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [0, 0], [-1, 1], [-1, 2]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [1, 1]]),
    new Shape([[0, 0], [0, 1], [0, 2], [-1, 2]])
  ], 3),
  // L
  new Piece([
    new Shape([[1, 0], [-1, 1], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [0, 2], [-1, 1], [-1, 2]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [-1, 1]]),
    new Shape([[-1, 0], [0, 0], [0, 1], [0, 2]])
  ], 4),
  // Z
  new Piece([
    new Shape([[-1, 0], [0, 0], [0, 1], [1, 1]]),
    new Shape([[0, 0], [-1, 1], [0, 1], [-1, 2]])
  ], 5),
  // S
  new Piece([
    new Shape([[0, 0], [1, 0], [-1, 1], [0, 1]]),
    new Shape([[-1, 0], [-1, 1], [0, 1], [0, 2]]),
  ], 1),
  // T
  new Piece([
    new Shape([[-1, 1], [0, 0], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [-1, 1], [-1, 2], [0, 1]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [0, 1]]),
    new Shape([[0, 0], [0, 1], [0, 2], [-1, 1]])
  ], 2)
];

export function randomPiece(): Piece {
  return PIECES[randInt(PIECES.length)];
}

// for debugging
export function cyclePiece(p: Piece): Piece {
  let i = (PIECES.indexOf(p)+1)%PIECES.length;
  return PIECES[i];
}
