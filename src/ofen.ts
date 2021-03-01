import { pos2key, invRanks } from './util';
import * as og from './types';

export const initial: og.OFEN = 'ppkn/4/4/NKPP';

const roles: { [letter: string]: og.Role } = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

const letters = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k',
};

export function read(fen: og.OFEN): og.Pieces {
  if (fen === 'start') fen = initial;
  const pieces: og.Pieces = new Map();
  let row = 3,
    col = 0;
  for (const c of fen) {
    switch (c) {
      case ' ':
        return pieces;
      case '/':
        --row;
        if (row < 0) return pieces;
        col = 0;
        break;
      case '~':
        const piece = pieces.get(pos2key([col, row]));
        if (piece) piece.promoted = true;
        break;
      default:
        const nb = c.charCodeAt(0);
        if (nb < 57) col += nb - 48;
        else {
          const role = c.toLowerCase();
          pieces.set(pos2key([col, row]), {
            role: roles[role],
            color: c === role ? 'black' : 'white',
          });
          ++col;
        }
    }
  }
  return pieces;
}

export function write(pieces: og.Pieces): og.OFEN {
  return invRanks
    .map(y =>
      og.files
        .map(x => {
          const piece = pieces.get((x + y) as og.Key);
          if (piece) {
            const letter = letters[piece.role];
            return piece.color === 'white' ? letter.toUpperCase() : letter;
          } else return '1';
        })
        .join('')
    )
    .join('/')
    .replace(/1{2,}/g, s => s.length.toString());
}
