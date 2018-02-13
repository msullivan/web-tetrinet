import { SQUARE_SIZE, GAP } from "consts";
import { randInt } from "util";

export function square(ctx, x, y) {
  ctx.fillRect(x * (SQUARE_SIZE + GAP), y * (SQUARE_SIZE + GAP),
               SQUARE_SIZE, SQUARE_SIZE);
}

export const COLORS = [
  undefined,
  'rgb(255, 0, 0)',
  'rgb(0, 255, 0)',
  'rgb(0, 0, 255)',
  'rgb(255, 255, 0)',
  'rgb(255, 0, 255)',
  'rgb(0, 255, 255)',
];

export function randomColor(): number {
  return 1 + randInt(COLORS.length - 1);
}

export const CLEARED_COLOR = 'rgb(200, 200, 200)';
