import { BoardState, Cell } from 'boardstate';
import { GameState } from 'gamestate';
import { BOARD_HEIGHT, BOARD_WIDTH, NUM_COLORS, SAFE_ROWS,
         CLEAR_RANDOM_BLOCK_COUNT }  from 'consts';
import { randInt } from 'util';
import { randomColor } from 'draw_util';

export abstract class Special {
  static apply: (state: GameState, sourcePlayer: number) => void;
  static identifier: string;
  static desc: string;
}

export class AddLine extends Special {
  static identifier = "A";
  static desc = "Add Line";

  static apply = (state: GameState, sourcePlayer: number) => {
    const board = state.myBoard();
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
  }
}

let classicAddLinesN = (n: number) => {
  class ClassicAddLineN extends Special {
    static desc = n + " Lines Added";

    static applyOnce = (state: GameState, sourcePlayer: number) => {
      const board = state.myBoard();
      for (let y = 0; y < BOARD_HEIGHT - 1; y += 1) {
        for (let x = 0; x < BOARD_WIDTH; x += 1) {
          board.board[x][y] = board.board[x][y+1];
        }
      }

      const randomTile = (): Cell => {
        return new Cell(randomColor(), undefined);
      };

      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        board.board[x][BOARD_HEIGHT - 1] = randomTile();
      }

      board.board[randInt(BOARD_WIDTH)][BOARD_HEIGHT - 1] = undefined;
    }

    static apply = (state: GameState, sourcePlayer: number) => {
      for (let i = 0; i < n; i++) {
        ClassicAddLineN.applyOnce(state, sourcePlayer);
      }
    }
  }
  return ClassicAddLineN;
}
export let classicAddLines: typeof Special[] = []
for (let i = 2; i <= 4; i++) {
  classicAddLines[i] = classicAddLinesN(i);
}

export class ClearLine extends Special {
  static identifier = "C";
  static desc = "Clear Line";

  static apply = (state: GameState, sourcePlayer: number) => {
    state.myBoard().removeLine(BOARD_HEIGHT - 1);
  }
}

export class RandomClear extends Special {
  static identifier = "R";
  static desc = "Clear Random";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();
    for (let i = 0; i < CLEAR_RANDOM_BLOCK_COUNT; i += 1) {
      myBoard.board[randInt(BOARD_WIDTH)][randInt(BOARD_HEIGHT)] = undefined;
    }
  }
}

export class SwitchField extends Special {
  static identifier = "S";
  static desc = "Switch Fields";

  static apply = (state: GameState, sourcePlayer: number) => {
    const theirBoard = state.playerBoard(sourcePlayer);
    const myBoard = state.myBoard();

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        myBoard.board[x][y] = theirBoard.board[x][y];
      }
    }

    // If there are squares in the safe zone, remove lines until there aren't.
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < SAFE_ROWS; y += 1) {
        if (myBoard.board[x][y] !== undefined) {
          state.myBoard().removeLine(BOARD_HEIGHT - 1);
        }
      }
    }
  }
}

export class NukeField extends Special {
  static identifier = "N";
  static desc = "Nuke Field";

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
  static desc = "Clear Specials";

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
  static desc = "Block Gravity";

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
  static desc = "Blockquake";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();
    const quakeRow = (y: number) => {
      const i = randInt(22);
      let offset = 0;

      if (i < 1) { offset += 1; }
      if (i < 4) { offset += 1; }
      if (i < 11) { offset += 1; }

      if (randInt(2) == 0) { offset = BOARD_WIDTH - offset; }

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
  static desc = "Block Bomb";

  static apply = (state: GameState, sourcePlayer: number) => {
    const myBoard = state.myBoard();

    let bombLocations = [];

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      for (let y = 0; y < BOARD_HEIGHT; y += 1) {
        const cell = myBoard.board[x][y];
        if (cell !== undefined && cell.special === BlockBomb) {
          bombLocations.push([x, y]);
        }
      }
    }

    const newCoords = (): [number, number] => {
      let newX = randInt(BOARD_WIDTH);
      let newY = SAFE_ROWS + randInt(BOARD_HEIGHT - SAFE_ROWS);

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

export const SPECIALS: (typeof Special)[] = [
  AddLine, ClearLine, NukeField, RandomClear, SwitchField,
  ClearSpecials, Gravity, QuakeField, BlockBomb
];

export function randomSpecial(specialsFreq: number[]): typeof Special {
  const result = randInt(100);

  return SPECIALS[specialsFreq[result]];
}
