export type StitchDef = {
  name: string;
  desc: string;
};

export const STITCHES: StitchDef[] = [
  {
    name: 'Chain st.',
    desc: 'The foundation of everything. Simple loop pulled through — used for foundation chains and turning chains.',
  },
  {
    name: 'Magic ring',
    desc: 'A circular start: you form a yarn loop and crochet directly into it, then pull tight.',
  },
  {
    name: 'Single crochet',
    desc: 'The shortest stitch. Insert hook, pull up a loop, then draw through both loops at once.',
  },
  {
    name: 'Half double cr.',
    desc: 'Between sc and dc. Yarn over, insert, pull up loop, then draw through all 3 loops at once.',
  },
  {
    name: 'Double crochet',
    desc: 'The standard stitch. Yarn over, insert, pull up loop, then work off 2 loops twice (2 steps).',
  },
  {
    name: 'Treble crochet',
    desc: 'Yarn over twice before inserting. Taller than dc — great for lacy patterns.',
  },
  {
    name: 'Increase',
    desc: 'Work 2 (or more) stitches into the same stitch — adds stitches to increase count.',
  },
  {
    name: 'Decrease',
    desc: 'Join 2 adjacent stitches into one — reduces stitch count (common in amigurumi shaping).',
  },
  {
    name: 'Crab stitch',
    desc: 'Single crochet worked backwards (right to left). Creates a firm, twisted decorative border.',
  },
  {
    name: 'Popcorn st.',
    desc: 'Work 5 dc into one stitch, then close together — creates a raised, bobble-like bump.',
  },
  {
    name: 'Leaf stitch',
    desc: 'An oval leaf motif, typically built from 5-7 double crochets.',
  },
  {
    name: 'Turning chain',
    desc: 'Chain(s) at end of row to match next row height. 1 for sc, 2 for hdc, 3 for dc.',
  },
  {
    name: 'Slip stitch',
    desc: 'Joining stitch — no height. Used to close rounds or move to a new position.',
  },
];
