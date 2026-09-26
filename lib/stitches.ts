import type { StitchType, WorkedIn } from './types';

type StitchInfo = {
  abbr: string;
  label: string;
  /** Stitches this action leaves on the fabric (used to suggest the end count). */
  produces: number;
  /** Ring mark colours: done / next, and not-yet-worked. */
  strong: string;
  light: string;
  /** Chip colours. */
  chipBg: string;
  chipFg: string;
};

export const STITCHES: Record<StitchType, StitchInfo> = {
  sc: { abbr: 'sc', label: 'Single crochet', produces: 1, strong: '#8A7A68', light: '#E8E6DC', chipBg: '#EFEBE3', chipFg: '#5B5347' },
  inc: { abbr: 'inc', label: 'Increase', produces: 2, strong: '#7A5AA6', light: '#E6DCF2', chipBg: '#EDE5F6', chipFg: '#5B3F86' },
  dec: { abbr: 'dec', label: 'Decrease', produces: 1, strong: '#74855F', light: '#DCE3D2', chipBg: '#E7ECDD', chipFg: '#4D5B3D' },
  hdc: { abbr: 'hdc', label: 'Half double crochet', produces: 1, strong: '#B08A3E', light: '#F1E6CC', chipBg: '#F4EBD6', chipFg: '#7A5C1E' },
  dc: { abbr: 'dc', label: 'Double crochet', produces: 1, strong: '#6F8296', light: '#DFE5EB', chipBg: '#E4E9EE', chipFg: '#465566' },
  tr: { abbr: 'tr', label: 'Treble crochet', produces: 1, strong: '#4F8A8B', light: '#DCEBEB', chipBg: '#E1EEEE', chipFg: '#2F5E5F' },
  dtr: { abbr: 'dtr', label: 'Double treble crochet', produces: 1, strong: '#3E6E8C', light: '#D6E4EE', chipBg: '#DEEAF2', chipFg: '#28506A' },
  ch: { abbr: 'ch', label: 'Chain', produces: 1, strong: '#B0AEA5', light: '#EEEDE8', chipBg: '#F1F0EC', chipFg: '#6B675E' },
  slst: { abbr: 'sl st', label: 'Slip stitch', produces: 1, strong: '#5B5347', light: '#E3DED6', chipBg: '#E8E3DB', chipFg: '#332A22' },
};

export const STITCH_ORDER: StitchType[] = ['sc', 'inc', 'dec', 'hdc', 'dc', 'tr', 'dtr', 'ch', 'slst'];

/** "2 single crochet, then 1 increase" — consecutive identical stitches are grouped. */
export function describeUnit(unit: StitchType[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < unit.length) {
    let j = i;
    while (j < unit.length && unit[j] === unit[i]) j++;
    parts.push(`${j - i} ${STITCHES[unit[i]].label.toLowerCase()}`);
    i = j;
  }
  return parts.join(', then ');
}

export function instructionText(unit: StitchType[], workedIn: WorkedIn): string {
  if (unit.length === 0) return '';
  const where = workedIn === 'rounds' ? 'around' : 'across';
  if (unit.length === 1) return `${STITCHES[unit[0]].label} ${where}.`;
  return `Repeat ${where}: ${describeUnit(unit)}.`;
}

/** Stitch count at the end of the step, assuming every action is worked once per repeat. */
export function suggestedEndCount(unit: StitchType[], repeat: number): number | null {
  if (unit.length === 0) return null;
  return unit.reduce((sum, s) => sum + STITCHES[s].produces, 0) * repeat;
}
