import { State, Cell } from 'state';
import { BOARD_HEIGHT, BOARD_WIDTH, ADD_LINE_BLOCK_CHANCE }  from 'consts';
import { randInt } from 'util';
import { randomColor } from 'draw_util';

export abstract class Special {
  apply: (state: State) => void;
  static identifier: string;

  getIdentifier = () => { return (<typeof Special>this.constructor).identifier; }
}

export class AddLine extends Special {
  static identifier = "A";

  apply = (state: State) => {
    for (let y = 0; y < BOARD_HEIGHT - 1; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        state.board[x][y] = state.board[x][y+1];
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
      state.board[x][BOARD_HEIGHT - 1] = randomTile();
    }

    // TODO: recheck collisions.
  }
}

export class ClearLine extends Special {
  static identifier = "C";

  apply = (state: State) => {
    state.removeLine(BOARD_HEIGHT - 1);
    // TODO: recheck collisions.
  }
}

export class RandomClear extends Special {
  static identifier = "R";

  apply = (state: State) => {
    // TODO
  }
}

export class SwitchField extends Special {
  static identifier = "R";

  apply = (state: State) => {
    // TODO
  }
}

export class NukeField extends Special {
  static identifier = "N";

  apply = (state: State) => {
    // TODO
  }
}

export class ClearSpecials extends Special {
  static identifier = "B";

  apply = (state: State) => {
    // TODO
  }
}

export class Gravity extends Special {
  static identifier = "G";

  apply = (state: State) => {
    // TODO
  }
}

export class QuakeField extends Special {
  static identifier = "Q";

  apply = (state: State) => {
    // TODO
  }
}

export class BlockBomb extends Special {
  static identifier = "O";

  apply = (state: State) => {
    // TODO
  }
}

export const SPECIALS = [AddLine, ClearLine, NukeField, RandomClear, SwitchField,
                         ClearSpecials, Gravity, QuakeField, BlockBomb];
