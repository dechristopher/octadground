import { HeadlessState } from './state';
import { setCheck, setSelected } from './board';
import { read as fenRead } from './ofen';
import { DrawShape, DrawBrush } from './draw';
import * as og from './types';

export interface Config {
  ofen?: og.OFEN; // octad position in Octad Forsyth Notation
  orientation?: og.Color; // board orientation. white | black
  turnColor?: og.Color; // turn to play. white | black
  check?: og.Color | boolean; // true for current color, false to unset
  lastMove?: og.Key[]; // squares part of the last move ["c2", "c3"]
  selected?: og.Key; // square currently selected "a1"
  coordinates?: boolean; // include coords attributes
  autoCastle?: boolean; // immediately complete the castle by moving the rook after king move
  viewOnly?: boolean; // don't bind events: the user will never be able to move pieces around
  disableContextMenu?: boolean; // because who needs a context menu on an octad board
  resizable?: boolean; // listens to octadground.resize on document.body to clear bounds cache
  addPieceZIndex?: boolean; // adds z-index values to pieces (for 3D)
  // pieceKey: boolean; // add a data-key attribute to piece elements
  highlight?: {
    lastMove?: boolean; // add last-move class to squares
    check?: boolean; // add check class to squares
  };
  animation?: {
    enabled?: boolean;
    duration?: number;
  };
  movable?: {
    free?: boolean; // all moves are valid - board editor
    color?: og.Color | 'both'; // color that can move. white | black | both | undefined
    dests?: og.Dests; // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]}
    showDests?: boolean; // whether to add the move-dest class on squares
    events?: {
      after?: (orig: og.Key, dest: og.Key, metadata: og.MoveMetadata) => void; // called after the move has been played
      afterNewPiece?: (role: og.Role, key: og.Key, metadata: og.MoveMetadata) => void; // called after a new piece is dropped on the board
    };
    pieceCastle?: boolean; // castle by moving the king to the piece
  };
  premovable?: {
    enabled?: boolean; // allow premoves for color that can not move
    showDests?: boolean; // whether to add the premove-dest class on squares
    castle?: boolean; // whether to allow king castle premoves
    dests?: og.Key[]; // premove destinations for the current selection
    events?: {
      set?: (orig: og.Key, dest: og.Key, metadata?: og.SetPremoveMetadata) => void; // called after the premove has been set
      unset?: () => void; // called after the premove has been unset
    };
  };
  predroppable?: {
    enabled?: boolean; // allow predrops for color that can not move
    events?: {
      set?: (role: og.Role, key: og.Key) => void; // called after the predrop has been set
      unset?: () => void; // called after the predrop has been unset
    };
  };
  draggable?: {
    enabled?: boolean; // allow moves & premoves to use drag'n drop
    distance?: number; // minimum distance to initiate a drag; in pixels
    autoDistance?: boolean; // lets octadground set distance to zero when user drags pieces
    showGhost?: boolean; // show ghost of piece being dragged
    deleteOnDropOff?: boolean; // delete a piece when it is dropped off the board
  };
  selectable?: {
    // disable to enforce dragging over click-click move
    enabled?: boolean;
  };
  events?: {
    change?: () => void; // called after the situation changes on the board
    // called after a piece has been moved.
    // capturedPiece is undefined or like {color: 'white'; 'role': 'queen'}
    move?: (orig: og.Key, dest: og.Key, capturedPiece?: og.Piece) => void;
    dropNewPiece?: (piece: og.Piece, key: og.Key) => void;
    select?: (key: og.Key) => void; // called when a square is selected
    insert?: (elements: og.Elements) => void; // when the board DOM has been (re)inserted
  };
  drawable?: {
    enabled?: boolean; // can draw
    visible?: boolean; // can view
    defaultSnapToValidMove?: boolean;
    eraseOnClick?: boolean;
    shapes?: DrawShape[];
    autoShapes?: DrawShape[];
    brushes?: DrawBrush[];
    pieces?: {
      baseUrl?: string;
    };
    onChange?: (shapes: DrawShape[]) => void; // called after drawable shapes change
  };
}

export function configure(state: HeadlessState, config: Config): void {
  // don't merge destinations. Just override.
  if (config.movable?.dests) state.movable.dests = undefined;

  merge(state, config);

  // if an ofen was provided, replace the pieces
  if (config.ofen) {
    state.pieces = fenRead(config.ofen);
    state.drawable.shapes = [];
  }

  // apply config values that could be undefined yet meaningful
  if (config.hasOwnProperty('check')) setCheck(state, config.check || false);
  if (config.hasOwnProperty('lastMove') && !config.lastMove) state.lastMove = undefined;
  // in case of ZH drop last move, there's a single square.
  // if the previous last move had two squares,
  // the merge algorithm will incorrectly keep the second square.
  else if (config.lastMove) state.lastMove = config.lastMove;

  // fix move/premove dests
  if (state.selected) setSelected(state, state.selected);

  // no need for such short animations
  if (!state.animation.duration || state.animation.duration < 100) state.animation.enabled = false;

  if (!state.movable.pieceCastle && state.movable.dests) {
    const rank = state.movable.color === 'white' ? '1' : '4',
      kingStartPos = ('e' + rank) as og.Key,
      dests = state.movable.dests.get(kingStartPos),
      king = state.pieces.get(kingStartPos);
    if (!dests || !king || king.role !== 'king') return;
    state.movable.dests.set(
      kingStartPos,
      dests.filter(
        d =>
          !(d === 'a' + rank && dests.includes(('c' + rank) as og.Key)) &&
          !(d === 'd' + rank && dests.includes(('g' + rank) as og.Key))
      )
    );
  }
}

function merge(base: any, extend: any): void {
  for (const key in extend) {
    if (isObject(base[key]) && isObject(extend[key])) merge(base[key], extend[key]);
    else base[key] = extend[key];
  }
}

function isObject(o: unknown): boolean {
  return typeof o === 'object';
}
