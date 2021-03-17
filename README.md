# Octadground

_Octadground_ is a free/libre open source octad UI developed for
[lioctad.org](https://lioctad.org).
It targets modern browsers and is based off of the open source [Chessground](https://github.com/ornicar/chessground)
library.

![Octadground board](/screenshots/board.png)

## License

Octadground is distributed under the **GPL-3.0 license** (or any later version,
at your option).
When you use Octadground for your website, your combined work may be
distributed only under the GPL. **You must release your source code** to the
users of your website.

Please read more about GPL for JavaScript on [greendrake.info/#nfy0](http://greendrake.info/#nfy0).

## Features

Octadground is designed to fulfill all lioctad.org web and mobile apps needs, so it is pretty featureful.

- Well typed with TypeScript
- Fast. Uses a custom DOM diff algorithm to reduce DOM writes to the absolute minimum.
- Small footprint: 10K gzipped (31K unzipped). No dependencies.
- SVG drawing of circles, arrows, and custom user shapes on the board
- Arrows snap to valid moves. Freehand arrows can be drawn by dragging the mouse off the board and back while drawing an arrow.
- Entirely configurable and reconfigurable at any time
- Styling with CSS only: board and pieces can be changed by simply switching a class
- Fluid layout: board can be resized at any time
- Support for 3D pieces and boards
- Full mobile support (touchstart, touchmove, touchend)
- Move pieces by click
- Move pieces by drag & drop
  - Minimum distance before drag
  - Centralisation of the piece under the cursor
  - Piece ghost element
  - Drop off revert or trash
- Premove by click or drag
- Animation of pieces: moving and fading away
- Display last move, check, move destinations, and premove destinations (hover effects possible)
- Import and export positions in OFEN notation
- User callbacks

## Installation

```sh
npm install --save octadground
```

### Usage

```js
const Octadground = require('octadground').Octadground;

const config = {};
const ground = Octadground(document.body, config);
```

## Documentation

- [Config types](https://github.com/dechristopher/octadground/tree/master/src/config.ts)
- [Default config values](https://github.com/dechristopher/octadground/tree/master/src/state.ts)
- [API type signatures](https://github.com/dechristopher/octadground/tree/master/src/api.ts)

## Development

Install build dependencies:

```sh
yarn install
```

To build the node module:

```sh
yarn run compile -- --watch
```

To build the standalone:

```sh
yarn run dist -- --watch
```
