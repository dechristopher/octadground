import { HeadlessState } from './state';
import { setVisible, createEl } from './util';
import { colors, files, ranks } from './types';
import { createElement as createSVG, setAttributes } from './svg';
import { Elements } from './types';

export function renderWrap(element: HTMLElement, s: HeadlessState, relative: boolean): Elements {
  // .og-wrap (element passed to Octadground)
  //   og-helper (25%, display: table)
  //     og-container (800%)
  //       og-board
  //       svg.og-shapes
  //         defs
  //         g
  //       svg.og-custom-svgs
  //         g
  //       coords.ranks
  //       coords.files
  //       piece.ghost

  element.innerHTML = '';

  // ensure the og-wrap class is set
  // so bounds calculation can use the CSS width/height values
  // add that class yourself to the element before calling octadground
  // for a slight performance improvement! (avoids recomputing style)
  element.classList.add('og-wrap');

  for (const c of colors) element.classList.toggle('orientation-' + c, s.orientation === c);
  element.classList.toggle('manipulable', !s.viewOnly);

  const helper = createEl('og-helper');
  element.appendChild(helper);
  const container = createEl('og-container');
  helper.appendChild(container);

  const board = createEl('og-board');
  container.appendChild(board);

  let svg: SVGElement | undefined;
  let customSvg: SVGElement | undefined;
  if (s.drawable.visible && !relative) {
    svg = setAttributes(createSVG('svg'), { 'class': 'og-shapes' });
    svg.appendChild(createSVG('defs'));
    svg.appendChild(createSVG('g'));
    customSvg = setAttributes(createSVG('svg'), { 'class': 'og-custom-svgs' });
    customSvg.appendChild(createSVG('g'));
    container.appendChild(svg);
    container.appendChild(customSvg);
  }

  if (s.coordinates) {
    const orientClass = s.orientation === 'black' ? ' black' : '';
    container.appendChild(renderCoords(ranks, 'ranks' + orientClass));
    container.appendChild(renderCoords(files, 'files' + orientClass));
  }

  let ghost: HTMLElement | undefined;
  if (s.draggable.showGhost && !relative) {
    ghost = createEl('piece', 'ghost');
    setVisible(ghost, false);
    container.appendChild(ghost);
  }

  return {
    board,
    container,
    ghost,
    svg,
    customSvg,
  };
}

function renderCoords(elems: readonly string[], className: string): HTMLElement {
  const el = createEl('coords', className);
  let f: HTMLElement;
  for (const elem of elems) {
    f = createEl('coord');
    f.textContent = elem;
    el.appendChild(f);
  }
  return el;
}
