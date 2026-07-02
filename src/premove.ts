import * as util from './util';
import * as og from './types';

type Mobility = (x1: number, y1: number, x2: number, y2: number) => boolean;

function diff(a: number, b: number): number {
  return Math.abs(a - b);
}

function pawn(color: og.Color): Mobility {
  return (x1, y1, x2, y2) =>
    diff(x1, x2) < 2 &&
    (color === 'white'
      ? // allow 2 squares from the first two ranks, for horde
        y2 === y1 + 1 || (y1 <= 1 && y2 === y1 + 2 && x1 === x2)
      : // BUG FIX: mirror of the white case. The old bound was `y1 >= 6`, an 8x8 leftover (black's
        // rank-7 start) that is impossible on a 4-rank board, so black pawns could never premove two
        // squares. On a 4x4 board the top two ranks are indices 3 and 2, hence `y1 >= 2`.
        y2 === y1 - 1 || (y1 >= 2 && y2 === y1 - 2 && x1 === x2));
}

export const knight: Mobility = (x1, y1, x2, y2) => {
  const xd = diff(x1, x2);
  const yd = diff(y1, y2);
  return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
};

const bishop: Mobility = (x1, y1, x2, y2) => {
  return diff(x1, x2) === diff(y1, y2);
};

const rook: Mobility = (x1, y1, x2, y2) => {
  return x1 === x2 || y1 === y2;
};

export const queen: Mobility = (x1, y1, x2, y2) => {
  return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};

function king(color: og.Color, castleFiles: number[], canCastle: boolean): Mobility {
  return (x1, y1, x2, y2) =>
    (diff(x1, x2) < 2 && diff(y1, y2) < 2) || // standard king moves
    (canCastle && // if the king can castle
      y1 === y2 && // as long as moves are on the same rank
      y1 === (color === 'white' ? 0 : 3) && // as long as the rank is the correct rank for castling
        castleFiles.includes(x2)); // possible castle files align with destination square
}

function validCastleFiles(pieces: og.Pieces, color: og.Color) {
  const backRank = color === 'white' ? '1' : '4';

  // castling is position-relative: the king may castle with any friendly
  // pawn or knight on its back rank, wherever the two deployed. Premoves are
  // optimistic — rights, blocking, and check safety are validated server-side
  // when the premove executes, and the position may change before then.
  const files: number[] = [];
  for (const [key, piece] of pieces) {
    if (
      key[1] === backRank &&
      piece.color === color &&
      (piece.role === 'pawn' || piece.role === 'knight')
    ) {
      files.push(util.key2pos(key)[0]);
    }
  }

  return files;
}

export function premove(pieces: og.Pieces, key: og.Key, canCastle: boolean): og.Key[] {
  const piece = pieces.get(key);
  if (!piece) return [];
  const pos = util.key2pos(key),
    r = piece.role,
    mobility: Mobility =
      r === 'pawn'
        ? pawn(piece.color)
        : r === 'knight'
        ? knight
        : r === 'bishop'
        ? bishop
        : r === 'rook'
        ? rook
        : r === 'queen'
        ? queen
        : king(piece.color, validCastleFiles(pieces, piece.color), canCastle);
  return util.allPos
    .filter(pos2 => (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]))
    .map(util.pos2key);
}
