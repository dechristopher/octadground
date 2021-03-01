import * as og from './types';

export const invRanks: readonly og.Rank[] = [...og.ranks].reverse();

export const allKeys: readonly og.Key[] = Array.prototype.concat(...og.files.map(c => og.ranks.map(r => c + r)));

export const pos2key = (pos: og.Pos): og.Key => allKeys[4 * pos[0] + pos[1]];

export const key2pos = (k: og.Key): og.Pos => [k.charCodeAt(0) - 97, k.charCodeAt(1) - 49];

export const allPos: readonly og.Pos[] = allKeys.map(key2pos);

export function memo<A>(f: () => A): og.Memo<A> {
  let v: A | undefined;
  const ret = (): A => {
    if (v === undefined) v = f();
    return v;
  };
  ret.clear = () => {
    v = undefined;
  };
  return ret;
}

export const timer = (): og.Timer => {
  let startAt: number | undefined;
  return {
    start() {
      startAt = performance.now();
    },
    cancel() {
      startAt = undefined;
    },
    stop() {
      if (!startAt) return 0;
      const time = performance.now() - startAt;
      startAt = undefined;
      return time;
    },
  };
};

export const opposite = (c: og.Color): og.Color => (c === 'white' ? 'black' : 'white');

export const distanceSq = (pos1: og.Pos, pos2: og.Pos): number => {
  const dx = pos1[0] - pos2[0],
    dy = pos1[1] - pos2[1];
  return dx * dx + dy * dy;
};

export const samePiece = (p1: og.Piece, p2: og.Piece): boolean => p1.role === p2.role && p1.color === p2.color;

const posToTranslateBase = (pos: og.Pos, asWhite: boolean, xFactor: number, yFactor: number): og.NumberPair => [
  (asWhite ? pos[0] : 3 - pos[0]) * xFactor,
  (asWhite ? 3 - pos[1] : pos[1]) * yFactor,
];

export const posToTranslateAbs = (bounds: ClientRect): ((pos: og.Pos, asWhite: boolean) => og.NumberPair) => {
  const xFactor = bounds.width / 4,
    yFactor = bounds.height / 4;
  return (pos, asWhite) => posToTranslateBase(pos, asWhite, xFactor, yFactor);
};

export const posToTranslateRel = (pos: og.Pos, asWhite: boolean): og.NumberPair =>
  posToTranslateBase(pos, asWhite, 100, 100);

export const translateAbs = (el: HTMLElement, pos: og.NumberPair): void => {
  el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};

export const translateRel = (el: HTMLElement, percents: og.NumberPair): void => {
  el.style.transform = `translate(${percents[0]}%,${percents[1]}%)`;
};

export const setVisible = (el: HTMLElement, v: boolean): void => {
  el.style.visibility = v ? 'visible' : 'hidden';
};

export const eventPosition = (e: og.MouchEvent): og.NumberPair | undefined => {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY!];
  if (e.targetTouches?.[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  return; // touchend has no position!
};

export const isRightButton = (e: og.MouchEvent): boolean => e.buttons === 2 || e.button === 2;

export const createEl = (tagName: string, className?: string): HTMLElement => {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  return el;
};

export function computeSquareCenter(key: og.Key, asWhite: boolean, bounds: ClientRect): og.NumberPair {
  const pos = key2pos(key);
  if (!asWhite) {
    pos[0] = 3- pos[0];
    pos[1] = 3 - pos[1];
  }
  return [
    bounds.left + (bounds.width * pos[0]) / 4 + bounds.width / 16,
    bounds.top + (bounds.height * (3 - pos[1])) / 4 + bounds.height / 16,
  ];
}
