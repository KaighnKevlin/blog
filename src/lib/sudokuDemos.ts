// Miniature worked examples for each standard technique, used by the chips
// above the board. These are illustrations of the *pattern*, not full puzzles:
// only the cells that matter carry digits or pencil marks.
//
// Roles map onto the same colour language as the main walkthrough:
//   unit    — supporting evidence (blue)
//   pattern — the cells that form the technique (amber ring)
//   plain   — context, no highlight
// `strike` lists candidates the technique kills, drawn struck through in red.

export type DemoCell = {
  v?: number;
  marks?: string;
  strike?: string;
  role?: 'unit' | 'pattern';
};

export type Demo = {
  name: string;
  caption: string;
  cells: Record<number, DemoCell>;
};

const rc = (r: number, c: number) => r * 9 + c;

function build(pairs: [number, number, DemoCell][]): Record<number, DemoCell> {
  const out: Record<number, DemoCell> = {};
  for (const [r, c, cell] of pairs) out[rc(r, c)] = cell;
  return out;
}

export const DEMOS: Demo[] = [
  {
    name: 'Naked Single',
    caption:
      'Eight different digits already sit in R5C5’s row, column and box. Only 9 is left, so the cell writes itself.',
    cells: build([
      [4, 0, { v: 1, role: 'unit' }], [4, 1, { v: 2, role: 'unit' }], [4, 2, { v: 3, role: 'unit' }],
      [4, 6, { v: 4, role: 'unit' }], [4, 7, { v: 5, role: 'unit' }], [4, 8, { v: 6, role: 'unit' }],
      [0, 4, { v: 7, role: 'unit' }], [8, 4, { v: 8, role: 'unit' }],
      [4, 4, { v: 9, role: 'pattern' }],
    ]),
  },
  {
    name: 'Hidden Single',
    caption:
      'The four 5s outside the middle box rule out every cell in it but one. R5C5 may hold other candidates, but it is the only home left for the 5.',
    cells: build([
      [3, 0, { v: 5, role: 'unit' }], [5, 8, { v: 5, role: 'unit' }],
      [0, 3, { v: 5, role: 'unit' }], [8, 5, { v: 5, role: 'unit' }],
      [3, 3, { marks: '2489' }], [3, 4, { marks: '1249' }], [3, 5, { marks: '2389' }],
      [5, 3, { marks: '1367' }], [5, 4, { marks: '1789' }], [5, 5, { marks: '2679' }],
      [4, 3, { marks: '1348' }], [4, 5, { marks: '3489' }],
      [4, 4, { marks: '1245', role: 'pattern' }],
    ]),
  },
  {
    name: 'Naked Pair',
    caption:
      'Two cells in row 5 hold nothing but 2 and 7. Between them they must use both digits up, so no other cell in the row can be 2 or 7.',
    cells: build([
      [4, 0, { marks: '27', role: 'pattern' }],
      [4, 1, { marks: '27', role: 'pattern' }],
      [4, 3, { marks: '279', strike: '27' }],
      [4, 6, { marks: '127', strike: '27' }],
      [4, 8, { marks: '45' }],
    ]),
  },
  {
    name: 'Hidden Pair',
    caption:
      'In row 5, the digits 4 and 6 appear in only two cells. Two digits needing two cells fill them exactly, so every other candidate in those cells dies.',
    cells: build([
      [4, 0, { marks: '1469', strike: '19', role: 'pattern' }],
      [4, 1, { marks: '346', strike: '3', role: 'pattern' }],
      [4, 3, { marks: '139' }],
      [4, 6, { marks: '28' }],
      [4, 8, { marks: '1239' }],
    ]),
  },
  {
    name: 'Naked Triple',
    caption:
      'Three cells share only the digits 2, 5 and 8. They must consume all three, locking those digits out of the rest of the row.',
    cells: build([
      [4, 0, { marks: '25', role: 'pattern' }],
      [4, 1, { marks: '58', role: 'pattern' }],
      [4, 2, { marks: '28', role: 'pattern' }],
      [4, 4, { marks: '257', strike: '25' }],
      [4, 7, { marks: '89', strike: '8' }],
    ]),
  },
  {
    name: 'Pointing Pair',
    caption:
      'Within the top-left box, 3 can only go in the first row. The box must contain a 3, so it lands on that row — clearing 3 from the row’s other cells.',
    cells: build([
      [0, 0, { marks: '34', role: 'pattern' }],
      [0, 2, { marks: '37', role: 'pattern' }],
      [0, 1, { v: 8, role: 'unit' }],
      [1, 0, { marks: '15' }], [1, 1, { marks: '29' }], [1, 2, { marks: '17' }],
      [2, 0, { marks: '89' }], [2, 1, { marks: '45' }], [2, 2, { marks: '16' }],
      [0, 4, { marks: '356', strike: '3' }],
      [0, 7, { marks: '138', strike: '3' }],
    ]),
  },
  {
    name: 'Box/Line Reduction',
    caption:
      'The mirror image: in row 1, the only cells that can hold 3 both sit in the top-left box. That box spends its 3 on this row, so the rest of the box loses it.',
    cells: build([
      [0, 0, { marks: '34', role: 'pattern' }],
      [0, 1, { marks: '35', role: 'pattern' }],
      [0, 3, { marks: '126' }], [0, 4, { marks: '789' }], [0, 5, { marks: '24' }],
      [0, 6, { marks: '18' }], [0, 7, { marks: '69' }], [0, 8, { marks: '78' }],
      [1, 2, { marks: '37', strike: '3' }],
      [2, 0, { marks: '139', strike: '3' }],
    ]),
  },
  {
    name: 'X-Wing',
    caption:
      'On two rows, 4 is confined to the same two columns. Those columns must absorb both 4s, so no other cell in them can be 4.',
    cells: build([
      [1, 2, { marks: '48', role: 'pattern' }],
      [1, 7, { marks: '45', role: 'pattern' }],
      [5, 2, { marks: '34', role: 'pattern' }],
      [5, 7, { marks: '47', role: 'pattern' }],
      [3, 2, { marks: '146', strike: '4' }],
      [7, 2, { marks: '249', strike: '4' }],
      [3, 7, { marks: '34', strike: '4' }],
      [8, 7, { marks: '45', strike: '4' }],
    ]),
  },
  {
    name: 'Swordfish',
    caption:
      'The same trick one size up: three rows confine 7 to the same three columns, so those columns take all three 7s.',
    cells: build([
      [0, 1, { marks: '27', role: 'pattern' }],
      [0, 4, { marks: '57', role: 'pattern' }],
      [4, 4, { marks: '17', role: 'pattern' }],
      [4, 7, { marks: '79', role: 'pattern' }],
      [8, 1, { marks: '37', role: 'pattern' }],
      [8, 7, { marks: '67', role: 'pattern' }],
      [2, 1, { marks: '127', strike: '7' }],
      [6, 4, { marks: '478', strike: '7' }],
      [5, 7, { marks: '679', strike: '7' }],
    ]),
  },
  {
    name: 'XY-Wing',
    caption:
      'The pivot is 1 or 2. If it is 1 the right wing becomes 3; if it is 2 the lower wing becomes 3. Either way a 3 appears, so any cell seeing both wings loses its 3.',
    cells: build([
      [4, 1, { marks: '12', role: 'pattern' }],
      [4, 7, { marks: '13', role: 'pattern' }],
      [7, 1, { marks: '23', role: 'pattern' }],
      [7, 7, { marks: '356', strike: '3' }],
    ]),
  },
];
