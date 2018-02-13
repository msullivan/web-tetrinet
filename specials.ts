import { BoardState, Cell } from 'boardstate';
import { GameState } from 'gamestate';
import { BOARD_HEIGHT, BOARD_WIDTH, NUM_COLORS, BLOCK_BOMB_SAFE_ROWS }  from 'consts';
import { randInt } from 'util';
import { randomColor } from 'draw_util';

export abstract class Special {
  static apply: (state: GameState, sourcePlayer: number) => void;
  static identifier: string;
}

export class AddLine extends Special {
  static identifier = "A";

  static apply = (state: GameState, sourcePlayer: number) => {
    var board = state.myBoard();
    for (let y = 0; y < BOARD_HEIGHT - 1; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        board.board[x][y] = board.board[x][y+1];
      }
    }

    const randomTile = (): Cell => {
      const newColor = randInt(NUM_COLORS + 1);
      if (newColor === 0) {
        return undefined;
      } else {
        return new Cell(randomColor(), undefined);
      }
    };

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      board.board[x][BOARD_HEIGHT - 1] = randomTile();
    }

    // TODO: recheck collisions.
  }
}

export class ClearLine extends Special {
  static identifier = "C";

  static apply = (state: GameState, sourcePlayer: number) => {
    state.myBoard().removeLine(BOARD_HEIGHT - 1);
    // TODO: recheck collisions.
  }
}

export class RandomClear extends Special {
  static identifier = "R";

  static apply = (state: GameState, sourcePlayer: number) => {
    // TODO
  }
}

export class SwitchField extends Special {
  static identifier = "R";

  static apply = (state: GameState, sourcePlayer: number) => {
    const theirBoard = state.boards[sourcePlayer];
    const myBoard = state.myBoard();

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        myBoard.board[x][y] = theirBoard.board[x][y];
      }
    }
  }
}

export class NukeField extends Special {
  static identifier = "N";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        myBoard.board[x][y] = undefined;
      }
    }
  }
}

export class ClearSpecials extends Special {
  static identifier = "B";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        const cell = myBoard.board[x][y];
        if (cell !== undefined) {
          cell.clearSpecials();
        }
      }
    }
  }
}

export class Gravity extends Special {
  static identifier = "G";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();
    const gravitizeColumn = (column: Cell[]) => {
      for (let y = BOARD_HEIGHT - 1; y >= 0; y -= 1) {
        if (column[y] !== undefined) { continue; }

        for (let new_y = y - 1; new_y >= 0; new_y -= 1) {
          if (column[new_y] !== undefined) {
            column[y] = column[new_y];
            column[new_y] = undefined;
            break;
          }
        }
      }
    }

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      gravitizeColumn(myBoard.board[x]);
    }

    // We remove lines manually here, because we don't want the usual line
    // removal side effects.
    state.myBoard().removeLines();
  }
}

export class QuakeField extends Special {
  static identifier = "Q";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();
    const quakeRow = (y: number) => {
      let offset = randInt(BOARD_WIDTH);

      let origRow = [];
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        origRow.push(myBoard.board[x][y]);
      }

      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        myBoard.board[(x + offset) % BOARD_WIDTH][y] = origRow[x];
      }
    }

    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      quakeRow(y);
    }
  }
}

export class BlockBomb extends Special {
  static identifier = "O";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();

    let bombLocations = [];

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        const cell = myBoard.board[x][y];
        if (cell.special == BlockBomb) {
          bombLocations.push([x, y]);
        }
      }
    }

    const newCoords = (): [number, number] => {
      let newX = randInt(BOARD_WIDTH);
      let newY = BLOCK_BOMB_SAFE_ROWS + randInt(BOARD_HEIGHT - BLOCK_BOMB_SAFE_ROWS);

      return [newX, newY];
    }

    const explodeBomb = (x: number, y: number) => {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          if (x + dx >= 0 && x + dx < BOARD_WIDTH &&
              y + dy >= 0 && y + dy < BOARD_HEIGHT &&
              myBoard.board[x+dx][y+dy] !== undefined) {
            if (myBoard.board[x+dx][y+dy].special !== BlockBomb) {
              const target = newCoords();
              myBoard.board[target[0]][target[1]] = myBoard.board[x+dx][y+dy];
            }

            myBoard.board[x+dx][y+dy] = undefined;
          }
        }
      }
    }

    for (let loc of bombLocations) {
      explodeBomb(loc[0], loc[1]);
    }
  }
}

export const SPECIALS = [AddLine, ClearLine, NukeField, RandomClear, SwitchField,
                         ClearSpecials, Gravity, QuakeField, BlockBomb];

export function randomSpecial(specialsFreq: number[]): Special {
  const result = randInt(100);

  return new SPECIALS[specialsFreq[result] - 1]();
}
