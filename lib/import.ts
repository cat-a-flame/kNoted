import type { PatternStep, StitchType, WorkedIn, Yarn } from './types';
import { STITCHES, STITCH_ORDER, suggestedEndCount } from './stitches';

/**
 * The `.knoted.json` pattern file (format "knoted-pattern", version 1).
 * It mirrors what the pattern editor sends to `replace_pattern_steps`,
 * with yarns referenced by a key instead of a stash id.
 */
export const KNOTED_FORMAT = 'knoted-pattern';
export const KNOTED_VERSION = 1;

export type KnotedYarn = {
  key: string;
  colour_name: string;
  colour_hex: string | null;
  used_for: string | null;
};

export type KnotedStep = {
  name: string | null;
  note: string | null;
  /** Key into `yarns`. */
  yarn: string | null;
  stitch_unit: StitchType[];
  repeat_count: number;
  end_count: number | null;
  times: number;
};

export type KnotedPattern = {
  format: typeof KNOTED_FORMAT;
  version: typeof KNOTED_VERSION;
  pattern: {
    name: string;
    designer: string | null;
    hook_size: string | null;
    yarn_summary: string | null;
    worked_in: WorkedIn;
  };
  yarns: KnotedYarn[];
  steps: KnotedStep[];
};

export type ParseResult =
  | { ok: true; data: KnotedPattern }
  | { ok: false; errors: string[] };

const HEX = /^#[0-9A-Fa-f]{6}$/;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isPosInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1;
const isNonNegInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** Parses the text of a `.knoted.json` file. */
export function parsePatternText(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [`Not valid JSON: ${err instanceof Error ? err.message : String(err)}`] };
  }
  return parsePattern(json);
}

/** Checks the shape of a parsed file. Unknown keys are ignored so newer files still load. */
export function parsePattern(input: unknown): ParseResult {
  const errors: string[] = [];

  if (!isObject(input)) return { ok: false, errors: ['The file must contain a JSON object.'] };
  if (input.format !== KNOTED_FORMAT) {
    return { ok: false, errors: [`Not a kNoted pattern file (expected "format": "${KNOTED_FORMAT}").`] };
  }
  if (input.version !== KNOTED_VERSION) {
    const newer = typeof input.version === 'number' && input.version > KNOTED_VERSION;
    return {
      ok: false,
      errors: [newer ? `This file uses format version ${input.version}, which this version of kNoted can't read.` : 'Missing or unsupported "version" (expected 1).'],
    };
  }

  // pattern
  const p = input.pattern;
  let name = '';
  let workedIn: WorkedIn = 'rounds';
  const optText = (obj: Record<string, unknown>, key: string, where: string): string | null => {
    const v = obj[key];
    if (v == null) return null;
    if (typeof v !== 'string') { errors.push(`${where}: "${key}" must be text.`); return null; }
    return v.trim() || null;
  };
  let designer: string | null = null;
  let hookSize: string | null = null;
  let yarnSummary: string | null = null;
  if (!isObject(p)) {
    errors.push('Missing "pattern" details.');
  } else {
    if (typeof p.name !== 'string' || !p.name.trim()) errors.push('Pattern: "name" is required.');
    else name = p.name.trim();
    designer = optText(p, 'designer', 'Pattern');
    hookSize = optText(p, 'hook_size', 'Pattern');
    yarnSummary = optText(p, 'yarn_summary', 'Pattern');
    if (p.worked_in != null) {
      if (p.worked_in === 'rounds' || p.worked_in === 'rows') workedIn = p.worked_in;
      else errors.push('Pattern: "worked_in" must be "rounds" or "rows".');
    }
  }

  // yarns
  const yarns: KnotedYarn[] = [];
  if (input.yarns != null && !Array.isArray(input.yarns)) {
    errors.push('"yarns" must be a list.');
  } else {
    ((input.yarns as unknown[] | undefined) ?? []).forEach((y, i) => {
      const where = `Yarn ${i + 1}`;
      if (!isObject(y)) { errors.push(`${where}: must be an object.`); return; }
      if (typeof y.key !== 'string' || !y.key.trim()) { errors.push(`${where}: "key" is required.`); return; }
      const key = y.key.trim();
      if (yarns.some((other) => other.key === key)) { errors.push(`${where}: key "${key}" is used twice.`); return; }
      let hex: string | null = null;
      if (y.colour_hex != null) {
        if (typeof y.colour_hex === 'string' && HEX.test(y.colour_hex)) hex = y.colour_hex.toUpperCase();
        else errors.push(`${where}: "colour_hex" must look like #E8761E.`);
      }
      yarns.push({
        key,
        colour_name: optText(y, 'colour_name', where) ?? key,
        colour_hex: hex,
        used_for: optText(y, 'used_for', where),
      });
    });
  }

  // steps
  const steps: KnotedStep[] = [];
  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    errors.push('"steps" must be a list with at least one step.');
  } else {
    input.steps.forEach((s, i) => {
      const where = `Step ${i + 1}`;
      if (!isObject(s)) { errors.push(`${where}: must be an object.`); return; }

      let unit: StitchType[] = [];
      if (s.stitch_unit != null) {
        if (!Array.isArray(s.stitch_unit)) {
          errors.push(`${where}: "stitch_unit" must be a list of stitches.`);
        } else {
          const bad = s.stitch_unit.filter((t) => !STITCH_ORDER.includes(t as StitchType));
          if (bad.length) errors.push(`${where}: unknown stitch ${bad.map((t) => JSON.stringify(t)).join(', ')} (allowed: ${STITCH_ORDER.join(', ')}).`);
          else unit = s.stitch_unit as StitchType[];
        }
      }
      const countable = unit.length > 0;

      let repeat = 1;
      if (s.repeat_count != null) {
        if (isPosInt(s.repeat_count)) repeat = s.repeat_count;
        else errors.push(`${where}: "repeat_count" must be a whole number of 1 or more.`);
      }

      let end: number | null = null;
      if (s.end_count != null) {
        if (isNonNegInt(s.end_count)) end = s.end_count;
        else errors.push(`${where}: "end_count" must be a whole number of 0 or more.`);
      }

      let times = 1;
      if (s.times != null) {
        if (isPosInt(s.times)) times = s.times;
        else errors.push(`${where}: "times" must be a whole number of 1 or more.`);
      }

      let yarn: string | null = null;
      if (s.yarn != null) {
        if (typeof s.yarn !== 'string') errors.push(`${where}: "yarn" must be a yarn key.`);
        else if (!yarns.some((y) => y.key === s.yarn)) errors.push(`${where}: yarn "${s.yarn}" is not in "yarns".`);
        else yarn = s.yarn;
      }

      steps.push({
        name: optText(s, 'name', where),
        note: optText(s, 'note', where),
        yarn,
        stitch_unit: unit,
        repeat_count: countable ? repeat : 1,
        // Same rule as the editor: no count given means the calculated count.
        end_count: countable ? end ?? suggestedEndCount(unit, repeat) : end,
        times,
      });
    });
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      format: KNOTED_FORMAT,
      version: KNOTED_VERSION,
      pattern: { name, designer, hook_size: hookSize, yarn_summary: yarnSummary, worked_in: workedIn },
      yarns,
      steps,
    },
  };
}

/** Stitches of the previous round each action works into. */
const CONSUMES: Record<StitchType, number> = { sc: 1, hdc: 1, dc: 1, tr: 1, dtr: 1, inc: 1, dec: 2, ch: 0, slst: 1 };

export type StepWarning = { step: number; message: string };

/**
 * Walks the numbered rounds in order and flags counts that don't add up.
 * These are warnings, not errors: patterns have typos and special stitches
 * ("3 sc in the same stitch") that this simple model can't express.
 */
export function checkStitchCounts(steps: KnotedStep[], workedIn: WorkedIn = 'rounds'): StepWarning[] {
  const unitWord = workedIn === 'rounds' ? 'round' : 'row';
  const warnings: StepWarning[] = [];
  let prevEnd: number | null = null;

  steps.forEach((s, i) => {
    if (s.stitch_unit.length === 0) return;
    const made = s.stitch_unit.reduce((sum, t) => sum + STITCHES[t].produces, 0) * s.repeat_count;
    const used = s.stitch_unit.reduce((sum, t) => sum + CONSUMES[t], 0) * s.repeat_count;
    const end = s.end_count ?? made;

    if (made !== end) {
      warnings.push({ step: i, message: `Makes ${made} stitches, but the pattern says ${end}.` });
    }

    // Named steps (a leaf, a stem) are often separate pieces, so only numbered rounds chain.
    if (s.name) return;
    if (prevEnd !== null && used !== prevEnd) {
      warnings.push({ step: i, message: `Works into ${used} stitches, but the previous ${unitWord} ends with ${prevEnd}.` });
    }
    if (s.times > 1 && used !== end) {
      warnings.push({ step: i, message: `Repeated ${s.times}×, but each ${unitWord} works into ${used} stitches and ends with ${end}.` });
    }
    prevEnd = end;
  });

  return warnings;
}

/** Rows for the `replace_pattern_steps` RPC. `yarnIds` maps a file yarn key to a stash yarn id. */
export function toStepPayload(steps: KnotedStep[], yarnIds: Record<string, string | null>) {
  return steps.map((s) => ({
    name: s.name,
    note: s.note,
    yarn_id: s.yarn ? yarnIds[s.yarn] ?? null : null,
    stitch_unit: s.stitch_unit,
    repeat_count: s.repeat_count,
    end_count: s.end_count,
    times: s.times,
  }));
}

/** Steps shaped like saved rows, so the preview can use `expandSteps()` exactly as the tracker does. */
export function toPreviewSteps(steps: KnotedStep[], yarnIds: Record<string, string | null>): PatternStep[] {
  return toStepPayload(steps, yarnIds).map((s, i) => ({ ...s, id: `import-${i}`, pattern_id: 'import', position: i }));
}

/** Stash yarn whose colour name matches the file's, ignoring case. */
export function matchStashYarn<Y extends Pick<Yarn, 'id' | 'colour_name'>>(yarn: KnotedYarn, stash: Y[]): Y | null {
  const want = yarn.colour_name.trim().toLowerCase();
  return stash.find((y) => y.colour_name.trim().toLowerCase() === want) ?? null;
}

/** Builds a `.knoted.json` file from a saved pattern, for backup or sharing. */
export function buildExport(
  pattern: { name: string; hook_size: string | null; yarn_summary: string | null; worked_in: WorkedIn },
  steps: PatternStep[],
  stash: Pick<Yarn, 'id' | 'colour_name' | 'colour_hex'>[],
): KnotedPattern {
  const sorted = [...steps].sort((a, b) => a.position - b.position);
  const keys = new Map<string, string>();
  const yarns: KnotedYarn[] = [];

  sorted.forEach((s) => {
    if (!s.yarn_id || keys.has(s.yarn_id)) return;
    const y = stash.find((x) => x.id === s.yarn_id);
    if (!y) return;
    const base = slug(y.colour_name) || 'yarn';
    let key = base;
    for (let n = 2; yarns.some((other) => other.key === key); n++) key = `${base}-${n}`;
    keys.set(s.yarn_id, key);
    yarns.push({ key, colour_name: y.colour_name, colour_hex: y.colour_hex, used_for: null });
  });

  return {
    format: KNOTED_FORMAT,
    version: KNOTED_VERSION,
    pattern: {
      name: pattern.name,
      designer: null,
      hook_size: pattern.hook_size,
      yarn_summary: pattern.yarn_summary,
      worked_in: pattern.worked_in,
    },
    yarns,
    steps: sorted.map((s) => ({
      name: s.name,
      note: s.note,
      yarn: s.yarn_id ? keys.get(s.yarn_id) ?? null : null,
      stitch_unit: s.stitch_unit ?? [],
      repeat_count: s.repeat_count,
      end_count: s.end_count,
      times: s.times,
    })),
  };
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
