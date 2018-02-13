import { draw_square } from 'draw_util';
import { randInt} from 'util';

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
  constructor(shapes: Shape[]) {
    this.shapes = shapes;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, orientation: number) {
    const shape = this.shapes[orientation % this.shapes.length];
    shape.draw(ctx, x, y);
  }
}

// https://tetris.wiki/TetriNet_Rotation_System
export const PIECES = [
  // 4x1
  new Piece([
    new Shape([[-2, 0], [-1, 0], [0, 0], [1, 0]]),
    new Shape([[0, 0], [0, 1], [0, 2], [0, 3]]),
  ]),
  // 2x2
  new Piece([
    new Shape([[0, 0], [0, 1], [1, 0], [1, 1]]),
  ]),
  // J
  new Piece([
    new Shape([[-1, 0], [-1, 1], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [0, 0], [-1, 1], [-1, 2]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [1, 1]]),
    new Shape([[0, 0], [0, 1], [0, 2], [-1, 2]])
  ]),
  // L
  new Piece([
    new Shape([[1, 0], [-1, 1], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [0, 2], [-1, 1], [-1, 2]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [-1, 1]]),
    new Shape([[-1, 0], [0, 0], [0, 1], [0, 2]])
  ]),
  // Z
  new Piece([
    new Shape([[-1, 0], [0, 0], [0, 1], [1, 1]]),
    new Shape([[0, 0], [-1, 1], [0, 1], [-1, 2]])
  ]),
  // S
  new Piece([
    new Shape([[0, 0], [1, 0], [-1, 1], [0, 1]]),
    new Shape([[-1, 0], [-1, 1], [0, 1], [0, 2]]),
  ]),
  // T
  new Piece([
    new Shape([[-1, 1], [0, 0], [0, 1], [1, 1]]),
    new Shape([[-1, 0], [-1, 1], [-1, 2], [0, 1]]),
    new Shape([[-1, 0], [0, 0], [1, 0], [0, 1]]),
    new Shape([[0, 0], [0, 1], [0, 2], [-1, 1]])
  ])
];

export function randomPiece(): Piece {
  return PIECES[randInt(PIECES.length)];
}
