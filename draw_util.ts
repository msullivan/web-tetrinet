import { SQUARE_SIZE, GAP } from "consts";
import { randInt } from "util";

export function draw_square(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillRect(x * (SQUARE_SIZE + GAP) + GAP, y * (SQUARE_SIZE + GAP) + GAP,
               SQUARE_SIZE, SQUARE_SIZE);
}

export function draw_text(ctx: CanvasRenderingContext2D, x: number, y: number,
                          text: string) {
  const new_x = x * (SQUARE_SIZE + GAP) + Math.floor((SQUARE_SIZE + GAP) / 2);
  const new_y = y * (SQUARE_SIZE + GAP) + Math.floor((SQUARE_SIZE + GAP) / 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, new_x, new_y);
}

export const COLORS: string[] = [
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