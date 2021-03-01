import * as fen from './ofen';
import { AnimCurrent } from './anim';
import { DragCurrent } from './drag';
import { Drawable } from './draw';
import { timer } from './util';
import * as og from './types';

export interface HeadlessState {
  pieces: og.Pieces;
  orientation: og.Color; // board orientation. white | black
  turnColor: og.Color; // turn to play. white | black
  check?: og.Key; // square currently in check "a2"
  lastMove?: og.Key[]; // squares part of the last move ["c3"; "c4"]
  selected?: og.Key; // square currently selected "a1"
  coordinates: boolean; // include coords attributes
  autoCastle: boolean; // immediately complete the castle by moving the rook after king move
  viewOnly: boolean; // don't bind events: the user will never be able to move pieces around
  disableContextMenu: boolean; // because who needs a context menu on an octad board
  resizable: boolean; // listens to octadground.resize on document.body to clear bounds cache
  addPieceZIndex: boolean; // adds z-index values to pieces (for 3D)
  pieceKey: boolean; // add a data-key attribute to piece elements
  highlight: {
    lastMove: boolean; // add last-move class to squares
    check: boolean; // add check class to squares
  };
  animation: {
    enabled: boolean;
    duration: number;
    current?: AnimCurrent;
  };
  movable: {
    free: boolean; // all moves are valid - board editor
    color?: og.Color | 'both'; // color that can move. white | black | both
    dests?: og.Dests; // valid moves. {"a2" ["a3" "a4"] "b1" ["a3" "c3"]}
    showDests: boolean; // whether to add the move-dest class on squares
    events: {
      after?: (orig: og.Key, dest: og.Key, metadata: og.MoveMetadata) => void; // called after the move has been played
      afterNewPiece?: (role: og.Role, key: og.Key, metadata: og.MoveMetadata) => void; // called after a new piece is dropped on the board
    };
    rookCastle: boolean; // castle by moving the king to the rook
  };
  premovable: {
    enabled: boolean; // allow premoves for color that can not move
    showDests: boolean; // whether to add the premove-dest class on squares
    castle: boolean; // whether to allow king castle premoves
    dests?: og.Key[]; // premove destinations for the current selection
    current?: og.KeyPair; // keys of the current saved premove ["e2" "e4"]
    events: {
      set?: (orig: og.Key, dest: og.Key, metadata?: og.SetPremoveMetadata) => void; // called after the premove has been set
      unset?: () => void; // called after the premove has been unset
    };
  };
  predroppable: {
    enabled: boolean; // allow predrops for color that can not move
    current?: {
      // current saved predrop {role: 'knight'; key: 'e4'}
      role: og.Role;
      key: og.Key;
    };
    events: {
      set?: (role: og.Role, key: og.Key) => void; // called after the predrop has been set
      unset?: () => void; // called after the predrop has been unset
    };
  };
  draggable: {
    enabled: boolean; // allow moves & premoves to use drag'n drop
    distance: number; // minimum distance to initiate a drag; in pixels
    autoDistance: boolean; // lets octadground set distance to zero when user drags pieces
    showGhost: boolean; // show ghost of piece being dragged
    deleteOnDropOff: boolean; // delete a piece when it is dropped off the board
    current?: DragCurrent;
  };
  dropmode: {
    active: boolean;
    piece?: og.Piece;
  };
  selectable: {
    // disable to enforce dragging over click-click move
    enabled: boolean;
  };
  stats: {
    // was last piece dragged or clicked?
    // needs default to false for touch
    dragged: boolean;
    ctrlKey?: boolean;
  };
  events: {
    change?: () => void; // called after the situation changes on the board
    // called after a piece has been moved.
    // capturedPiece is undefined or like {color: 'white'; 'role': 'queen'}
    move?: (orig: og.Key, dest: og.Key, capturedPiece?: og.Piece) => void;
    dropNewPiece?: (piece: og.Piece, key: og.Key) => void;
    select?: (key: og.Key) => void; // called when a square is selected
    insert?: (elements: og.Elements) => void; // when the board DOM has been (re)inserted
  };
  drawable: Drawable;
  exploding?: og.Exploding;
  hold: og.Timer;
}

export interface State extends HeadlessState {
  dom: og.Dom;
}

export function defaults(): HeadlessState {
  return {
    pieces: fen.read(fen.initial),
    orientation: 'white',
    turnColor: 'white',
    coordinates: true,
    autoCastle: true,
    viewOnly: false,
    disableContextMenu: false,
    resizable: true,
    addPieceZIndex: false,
    pieceKey: false,
    highlight: {
      lastMove: true,
      check: true,
    },
    animation: {
      enabled: true,
      duration: 200,
    },
    movable: {
      free: true,
      color: 'both',
      showDests: true,
      events: {},
      rookCastle: true,
    },
    premovable: {
      enabled: true,
      showDests: true,
      castle: true,
      events: {},
    },
    predroppable: {
      enabled: false,
      events: {},
    },
    draggable: {
      enabled: true,
      distance: 3,
      autoDistance: true,
      showGhost: true,
      deleteOnDropOff: false,
    },
    dropmode: {
      active: false,
    },
    selectable: {
      enabled: true,
    },
    stats: {
      // on touchscreen, default to "tap-tap" moves
      // instead of drag
      dragged: !('ontouchstart' in window),
    },
    events: {},
    drawable: {
      enabled: true, // can draw
      visible: true, // can view
      defaultSnapToValidMove: true,
      eraseOnClick: true,
      shapes: [],
      autoShapes: [],
      brushes: {
        green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 15 },
        red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 15 },
        blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 15 },
        yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 15 },
        paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
        paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
        paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
        paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.35, lineWidth: 15 },
      },
      pieces: {
        baseUrl: 'https://lioctad.org/res/img/cburnett/',
      },
      prevSvgHash: '',
    },
    hold: timer(),
  };
}
