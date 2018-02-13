import { State } from 'state';
import { BOARD_HEIGHT, BOARD_WIDTH, ADD_LINE_BLOCK_CHANCE }  from 'consts';
import { randInt } from 'util';
import { randomColor } from 'draw_util';

abstract class Special {
  apply: (state: State) => void;
}

class AddLine extends Special {
  apply = (state: State) => {
    for (let y = 0; y < BOARD_HEIGHT - 1; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        state.board[x][y] = state.board[x][y+1];
      }
    }

    const randomTile = (): number => {
      if (randInt(100) > ADD_LINE_BLOCK_CHANCE) {
        return undefined;
      } else {
        return randomColor();
      }
    };

    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      state.board[x][BOARD_HEIGHT - 1] = randomTile();
    }

    // TODO: recheck collisions.
  }
}

class ClearLine extends Special {
  apply = (state: State) => {
    state.removeLine(BOARD_HEIGHT - 1);
    // TODO: recheck collisions.
  }
}

class ClearSpecials extends Special {
  apply = (state: State) => {
    // TODO
  }
}

// TODO: all the others.
