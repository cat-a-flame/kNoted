import type { PatternStep, StitchType, WorkedIn, Yarn } from './types';
import { instructionText } from './stitches';
import { clamp } from './utils';

/** One entry in the tracker: a `times: 9` step becomes nine TrackSteps. */
export type TrackStep = {
  key: string;
  number: number | null;
  title: string;
  eyebrow: string;
  badge: string;
  yarnId: string | null;
  yarnHex: string | null;
  note: string | null;
  text: string;
  unit: StitchType[];
  repeat: number;
  end: number | null;
  countable: boolean;
  actionsTotal: number;
  stretch: { label: string; pos: number; total: number } | null;
};

export function expandSteps(
  steps: PatternStep[],
  yarns: Pick<Yarn, 'id' | 'colour_hex'>[],
  workedIn: WorkedIn,
): TrackStep[] {
  const unitWord = workedIn === 'rounds' ? 'Round' : 'Row';
  const yarnHex = new Map(yarns.map((y) => [y.id, y.colour_hex]));
  const out: TrackStep[] = [];
  let n = 0;

  [...steps]
    .sort((a, b) => a.position - b.position)
    .forEach((step) => {
      const unit = step.stitch_unit ?? [];
      const countable = unit.length > 0;
      const times = Math.max(step.times, 1);
      const firstNumber = n + 1;

      for (let k = 0; k < times; k++) {
        const name = step.name?.trim();
        let number: number | null = null;
        let title: string;
        if (name) {
          title = times > 1 ? `${name} (${k + 1})` : name;
        } else {
          number = ++n;
          title = `${unitWord} ${number}`;
        }

        const stretch =
          times > 1
            ? {
                label: name ? `${name} ×${times}` : `R${firstNumber}–R${firstNumber + times - 1}`,
                pos: k + 1,
                total: times,
              }
            : null;

        out.push({
          key: `${step.id}-${k}`,
          number,
          title,
          eyebrow: title.toUpperCase(),
          badge: number !== null ? String(number) : badgeFor(name ?? ''),
          yarnId: step.yarn_id,
          yarnHex: step.yarn_id ? yarnHex.get(step.yarn_id) ?? null : null,
          // A note on a repeated step belongs to the first of the run.
          note: k === 0 ? step.note : null,
          text: instructionText(unit, workedIn),
          unit,
          repeat: step.repeat_count,
          end: step.end_count,
          countable,
          actionsTotal: countable ? unit.length * step.repeat_count : 0,
          stretch,
        });
      }
    });

  return out;
}

function badgeFor(name: string): string {
  const word = name.split(/\s+/)[0] ?? '';
  const short = word.slice(0, 3);
  return short ? short[0].toUpperCase() + short.slice(1).toLowerCase() : '•';
}

export function stepSubtitle(step: TrackStep, workedIn: WorkedIn): string {
  const unitWord = workedIn === 'rounds' ? 'round' : 'row';
  if (step.stretch && step.countable) {
    const plain = step.unit.length === 1 && step.unit[0] !== 'inc' && step.unit[0] !== 'dec';
    return `${plain ? 'Plain' : 'Same'} ${unitWord} ${step.stretch.pos} of ${step.stretch.total}`;
  }
  if (step.countable) return `${step.actionsTotal} stitches`;
  return 'Finishing steps';
}

/** Overall progress 0..1, counting stitches made in the current step. */
export function progressFraction(
  steps: TrackStep[],
  currentStep: number,
  currentStitch: number,
  finished: boolean,
): number {
  if (finished) return 1;
  if (steps.length === 0) return 0;
  const idx = clamp(currentStep, 0, steps.length - 1);
  const step = steps[idx];
  const within = step.countable ? clamp(currentStitch, 0, step.actionsTotal) / step.actionsTotal : 0;
  return (idx + within) / steps.length;
}

/** Stitch types used anywhere in the pattern, for the sidebar stitch key. */
export function usedStitches(steps: TrackStep[]): StitchType[] {
  const seen = new Set<StitchType>();
  steps.forEach((s) => s.unit.forEach((t) => seen.add(t)));
  return [...seen];
}
