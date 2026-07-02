import { HeadlessState } from './state';
import { pos2key, key2pos, opposite, distanceSq, allPos, computeSquareCenter } from './util';
import { premove, queen, knight } from './premove';
import * as og from './types';

export function callUserFunction<T extends (...args: any[]) => void>(f: T | undefined, ...args: Parameters<T>): void {
  if (f) setTimeout(() => f(...args), 1);
}

export function toggleOrientation(state: HeadlessState): void {
  state.orientation = opposite(state.orientation);
  state.animation.current = state.draggable.current = state.selected = undefined;
}

export function reset(state: HeadlessState): void {
  state.lastMove = undefined;
  unselect(state);
  unsetPremove(state);
  unsetPredrop(state);
}

export function setPieces(state: HeadlessState, pieces: og.PiecesDiff): void {
  for (const [key, piece] of pieces) {
    if (piece) state.pieces.set(key, piece);
    else state.pieces.delete(key);
  }
}

export function setCheck(state: HeadlessState, color: og.Color | boolean): void {
  state.check = undefined;
  if (color === true) color = state.turnColor;
  if (color)
    for (const [k, p] of state.pieces) {
      if (p.role === 'king' && p.color === color) {
        state.check = k;
      }
    }
}

function setPremove(state: HeadlessState, orig: og.Key, dest: og.Key, meta: og.SetPremoveMetadata): void {
  unsetPredrop(state);
  state.premovable.current = [orig, dest];
  callUserFunction(state.premovable.events.set, orig, dest, meta);
}

export function unsetPremove(state: HeadlessState): void {
  if (state.premovable.current) {
    state.premovable.current = undefined;
    callUserFunction(state.premovable.events.unset);
  }
}

function setPredrop(state: HeadlessState, role: og.Role, key: og.Key): void {
  unsetPremove(state);
  state.predroppable.current = { role, key };
  callUserFunction(state.predroppable.events.set, role, key);
}

export function unsetPredrop(state: HeadlessState): void {
  const pd = state.predroppable;
  if (pd.current) {
    pd.current = undefined;
    callUserFunction(pd.events.unset);
  }
}

function tryAutoCastle(state: HeadlessState, orig: og.Key, dest: og.Key): boolean {
  if (!state.autoCastle) return false;

  const king = state.pieces.get(orig);
  if (!king || king.role !== 'king') return false;

  const origPos = key2pos(orig);
  const destPos = key2pos(dest);
  // castling stays on a single back rank: white rank 1 (index 0) or black rank 4 (index 3)
  if ((origPos[1] !== 0 && origPos[1] !== 3) || origPos[1] !== destPos[1]) return false;
  // NOTE: a previous `if (origPos[0] === 1 ...)` block reassigned `dest` to pos2key([destPos[0], ...]) —
  // i.e. to itself — in every branch, so it was a pure no-op and has been removed.

  // the king castles by moving directly onto the partner piece (a knight or pawn).
  // in octad, all starting pieces can be castled with.
  const piece = state.pieces.get(dest);
  if (!piece || piece.color !== king.color || (piece.role !== 'pawn' && piece.role !== 'knight')) return false;

  // adjacent partners swap squares; distant partners (two or three files apart)
  // cross instead — the king lands one square short of the partner and the
  // partner lands on the square just beyond the king
  const kingFile = origPos[0],
    destFile = destPos[0],
    rank = destPos[1];
  const dir = destFile > kingFile ? 1 : -1;
  state.pieces.delete(orig);
  state.pieces.delete(dest);
  if (Math.abs(destFile - kingFile) === 1) {
    state.pieces.set(dest, king);
    state.pieces.set(orig, piece);
  } else {
    state.pieces.set(pos2key([destFile - dir, rank]), king);
    state.pieces.set(pos2key([destFile - 2 * dir, rank]), piece);
  }
  return true;
}

export function baseMove(state: HeadlessState, orig: og.Key, dest: og.Key): og.Piece | boolean {
  const origPiece = state.pieces.get(orig),
    destPiece = state.pieces.get(dest);
  if (orig === dest || !origPiece) return false;
  const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
  if (dest === state.selected) unselect(state);
  callUserFunction(state.events.move, orig, dest, state.pieces, captured);
  if (!tryAutoCastle(state, orig, dest)) {
    state.pieces.set(dest, origPiece);
    state.pieces.delete(orig);
  }
  state.lastMove = [orig, dest];
  state.check = undefined;
  callUserFunction(state.events.change);
  return captured || true;
}

export function baseNewPiece(state: HeadlessState, piece: og.Piece, key: og.Key, force?: boolean): boolean {
  if (state.pieces.has(key)) {
    if (force) state.pieces.delete(key);
    else return false;
  }
  callUserFunction(state.events.dropNewPiece, piece, key);
  state.pieces.set(key, piece);
  state.lastMove = [key];
  state.check = undefined;
  callUserFunction(state.events.change);
  state.movable.dests = undefined;
  state.turnColor = opposite(state.turnColor);
  return true;
}

function baseUserMove(state: HeadlessState, orig: og.Key, dest: og.Key): og.Piece | boolean {
  const result = baseMove(state, orig, dest);
  if (result) {
    state.movable.dests = undefined;
    state.turnColor = opposite(state.turnColor);
    state.animation.current = undefined;
  }
  return result;
}

export function userMove(state: HeadlessState, orig: og.Key, dest: og.Key): boolean {
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const holdTime = state.hold.stop();
      unselect(state);
      const metadata: og.MoveMetadata = {
        premove: false,
        ctrlKey: state.stats.ctrlKey,
        holdTime,
      };
      if (result !== true) metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      return true;
    }
  } else if (canPremove(state, orig, dest)) {
    setPremove(state, orig, dest, {
      ctrlKey: state.stats.ctrlKey,
    });
    unselect(state);
    return true;
  }
  unselect(state);
  return false;
}

export function dropNewPiece(state: HeadlessState, orig: og.Key, dest: og.Key, force?: boolean): void {
  const piece = state.pieces.get(orig);
  if (piece && (canDrop(state, orig, dest) || force)) {
    state.pieces.delete(orig);
    baseNewPiece(state, piece, dest, force);
    callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
      premove: false,
      predrop: false,
    });
  } else if (piece && canPredrop(state, orig, dest)) {
    setPredrop(state, piece.role, dest);
  } else {
    unsetPremove(state);
    unsetPredrop(state);
  }
  state.pieces.delete(orig);
  unselect(state);
}

export function selectSquare(state: HeadlessState, key: og.Key, force?: boolean): void {
  callUserFunction(state.events.select, key);
  if (state.selected) {
    if (state.selected === key && !state.draggable.enabled) {
      unselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== key) {
      if (userMove(state, state.selected, key)) {
        state.stats.dragged = false;
        return;
      }
    }
  }
  if (isMovable(state, key) || isPremovable(state, key)) {
    setSelected(state, key);
    state.hold.start();
  }
}

export function setSelected(state: HeadlessState, key: og.Key): void {
  state.selected = key;
  if (isPremovable(state, key)) {
    state.premovable.dests = premove(state.pieces, key, state.premovable.castle);
  } else state.premovable.dests = undefined;
}

export function unselect(state: HeadlessState): void {
  state.selected = undefined;
  state.premovable.dests = undefined;
  state.hold.cancel();
}

function isMovable(state: HeadlessState, orig: og.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

export function canMove(state: HeadlessState, orig: og.Key, dest: og.Key): boolean {
  return (
    orig !== dest && isMovable(state, orig) && (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest))
  );
}

function canDrop(state: HeadlessState, orig: og.Key, dest: og.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (orig === dest || !state.pieces.has(dest)) &&
    (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

function isPremovable(state: HeadlessState, orig: og.Key): boolean {
  const piece = state.pieces.get(orig);
  return !!piece && state.premovable.enabled && state.movable.color === piece.color && state.turnColor !== piece.color;
}

function canPremove(state: HeadlessState, orig: og.Key, dest: og.Key): boolean {
  return (
    orig !== dest && isPremovable(state, orig) && premove(state.pieces, orig, state.premovable.castle).includes(dest)
  );
}

function canPredrop(state: HeadlessState, orig: og.Key, dest: og.Key): boolean {
  const piece = state.pieces.get(orig);
  const destPiece = state.pieces.get(dest);
  return (
    !!piece &&
    (!destPiece || destPiece.color !== state.movable.color) &&
    state.predroppable.enabled &&
    (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '4')) &&
    state.movable.color === piece.color &&
    state.turnColor !== piece.color
  );
}

export function isDraggable(state: HeadlessState, orig: og.Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    state.draggable.enabled &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)))
  );
}

export function playPremove(state: HeadlessState): boolean {
  const move = state.premovable.current;
  if (!move) return false;
  const orig = move[0],
    dest = move[1];
  let success = false;
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const metadata: og.MoveMetadata = { premove: true };
      if (result !== true) metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      success = true;
    }
  }
  unsetPremove(state);
  return success;
}

export function playPredrop(state: HeadlessState, validate: (drop: og.Drop) => boolean): boolean {
  const drop = state.predroppable.current;
  let success = false;
  if (!drop) return false;
  if (validate(drop)) {
    const piece = {
      role: drop.role,
      color: state.movable.color,
    } as og.Piece;
    if (baseNewPiece(state, piece, drop.key)) {
      callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
        premove: false,
        predrop: true,
      });
      success = true;
    }
  }
  unsetPredrop(state);
  return success;
}

export function cancelMove(state: HeadlessState): void {
  unsetPremove(state);
  unsetPredrop(state);
  unselect(state);
}

export function stop(state: HeadlessState): void {
  state.movable.color = state.movable.dests = state.animation.current = undefined;
  cancelMove(state);
}

export function getKeyAtDomPos(pos: og.NumberPair, asWhite: boolean, bounds: ClientRect): og.Key | undefined {
  let file = Math.floor((4 * (pos[0] - bounds.left)) / bounds.width);
  if (!asWhite) file = 3 - file;
  let rank = 3 - Math.floor((4 * (pos[1] - bounds.top)) / bounds.height);
  if (!asWhite) rank = 3 - rank;
  return file >= 0 && file < 4 && rank >= 0 && rank < 4 ? pos2key([file, rank]) : undefined;
}

export function getSnappedKeyAtDomPos(
  orig: og.Key,
  pos: og.NumberPair,
  asWhite: boolean,
  bounds: ClientRect
): og.Key | undefined {
  const origPos = key2pos(orig);
  const validSnapPos = allPos.filter(pos2 => {
    return queen(origPos[0], origPos[1], pos2[0], pos2[1]) || knight(origPos[0], origPos[1], pos2[0], pos2[1]);
  });
  const validSnapCenters = validSnapPos.map(pos2 => computeSquareCenter(pos2key(pos2), asWhite, bounds));
  const validSnapDistances = validSnapCenters.map(pos2 => distanceSq(pos, pos2));
  const [, closestSnapIndex] = validSnapDistances.reduce((a, b, index) => (a[0] < b ? a : [b, index]), [
    validSnapDistances[0],
    0,
  ]);
  return pos2key(validSnapPos[closestSnapIndex]);
}

export function whitePov(s: HeadlessState): boolean {
  return s.orientation === 'white';
}
