import { SQUARE_SIZE, GAP, BOARD_WIDTH, BOARD_HEIGHT } from "consts";
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
  'rgb(68,68,151)', // blue
  'rgb(151, 151, 68)', // yellow
  'rgb(68, 151, 68)', // green
  'rgb(151, 68, 151)', // magenta
  'rgb(151, 68, 68)', // red
];

export function randomColor(): number {
  return 1 + randInt(COLORS.length - 1);
}

export const CLEARED_COLOR = 'rgb(230, 230, 230)';
export const SPECIAL_COLOR = 'rgb(200, 200, 200)';

export function sizeCanvasForBoard(canvas: HTMLCanvasElement, scale = 1.0) {
  canvas.width = scale * (SQUARE_SIZE * BOARD_WIDTH + GAP * (BOARD_WIDTH + 1));
  canvas.height = scale * (SQUARE_SIZE * BOARD_HEIGHT + GAP * (BOARD_HEIGHT + 1));
}
