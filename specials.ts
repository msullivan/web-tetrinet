import { BoardState, Cell } from 'boardstate';
import { GameState } from 'gamestate';
import { BOARD_HEIGHT, BOARD_WIDTH, ADD_LINE_BLOCK_CHANCE }  from 'consts';
import { randInt } from 'util';
import { randomColor } from 'draw_util';

export abstract class Special {
  apply: (state: GameState) => void;
  static identifier: string;

  getIdentifier = () => { return (<typeof Special>this.constructor).identifier; }
}

export class AddLine extends Special {
  static identifier = "A";

  apply = (state: GameState) => {
    let board = state.myBoard();
    for (let y = 0; y < BOARD_HEIGHT - 1; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        board.board[x][y] = board.board[x][y+1];
      }
    }

    const randomTile = (): Cell => {
      if (randInt(100) > ADD_LINE_BLOCK_CHANCE) {
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

  apply = (state: GameState) => {
    state.myBoard().removeLine(BOARD_HEIGHT - 1);
    // TODO: recheck collisions.
  }
}

export class RandomClear extends Special {
  static identifier = "R";

  apply = (state: GameState) => {
    // TODO
  }
}

export class SwitchField extends Special {
  static identifier = "R";

  apply = (state: GameState) => {
    // TODO
  }
}

export class NukeField extends Special {
  static identifier = "N";

  apply = (state: GameState) => {
    // TODO
  }
}

export class ClearSpecials extends Special {
  static identifier = "B";

  apply = (state: GameState) => {
    // TODO
  }
}

export class Gravity extends Special {
  static identifier = "G";

  apply = (state: GameState) => {
    // TODO
  }
}

export class QuakeField extends Special {
  static identifier = "Q";

  apply = (state: GameState) => {
    // TODO
  }
}

export class BlockBomb extends Special {
  static identifier = "O";

  apply = (state: GameState) => {
    // TODO
  }
}

export const SPECIALS = [AddLine, ClearLine, NukeField, RandomClear, SwitchField,
                         ClearSpecials, Gravity, QuakeField, BlockBomb];

export function randomSpecial(specialsFreq: number[]): Special {
  const result = randInt(100);

  return new SPECIALS[specialsFreq[result] - 1]();
}
