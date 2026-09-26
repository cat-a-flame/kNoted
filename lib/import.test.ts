import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildExport,
  checkStitchCounts,
  matchStashYarn,
  parsePattern,
  parsePatternText,
  toPreviewSteps,
  toStepPayload,
  type KnotedStep,
} from './import';
import { expandSteps } from './track';

const sampleText = readFileSync(join(__dirname, '..', 'samples', 'little-pumpkin.knoted.json'), 'utf8');

const minimal = (steps: unknown[], extra: Record<string, unknown> = {}) => ({
  format: 'knoted-pattern',
  version: 1,
  pattern: { name: 'Test' },
  steps,
  ...extra,
});

const round = (unit: KnotedStep['stitch_unit'], repeat: number, end: number | null, times = 1): KnotedStep => ({
  name: null,
  note: null,
  yarn: null,
  stitch_unit: unit,
  repeat_count: repeat,
  end_count: end,
  times,
});

function parseOk(input: unknown) {
  const result = parsePattern(input);
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.data;
}

function parseErrors(input: unknown) {
  const result = parsePattern(input);
  if (result.ok) throw new Error('Expected errors');
  return result.errors;
}

describe('little-pumpkin sample', () => {
  const result = parsePatternText(sampleText);

  it('parses', () => {
    expect(result.ok).toBe(true);
  });

  it('keeps the pattern details and yarns', () => {
    if (!result.ok) return;
    expect(result.data.pattern).toEqual({
      name: 'Little Pumpkin',
      designer: 'kNoted sample',
      hook_size: '4.5 mm',
      yarn_summary: 'Worsted #4 cotton',
      worked_in: 'rounds',
    });
    expect(result.data.yarns.map((y) => y.key)).toEqual(['orange', 'green']);
  });

  it('has no stitch-count warnings', () => {
    if (!result.ok) return;
    expect(checkStitchCounts(result.data.steps, result.data.pattern.worked_in)).toEqual([]);
  });

  it('expands to 26 rounds plus named steps in the tracker', () => {
    if (!result.ok) return;
    const tracked = expandSteps(toPreviewSteps(result.data.steps, { orange: 'y1', green: 'y2' }), [], 'rounds');
    const numbered = tracked.filter((t) => t.number !== null);
    expect(numbered).toHaveLength(26);
    expect(numbered.at(-1)?.title).toBe('Round 26');
    expect(tracked.filter((t) => t.title.startsWith('Shape segment')).map((t) => t.title)).toEqual([
      'Shape segment (1)', 'Shape segment (2)', 'Shape segment (3)',
      'Shape segment (4)', 'Shape segment (5)', 'Shape segment (6)',
    ]);
    expect(tracked.find((t) => t.title === 'Round 13')?.stretch).toEqual({ label: 'R9–R19', pos: 5, total: 11 });
  });

  it('maps yarn keys to stash ids in the RPC payload', () => {
    if (!result.ok) return;
    const payload = toStepPayload(result.data.steps, { orange: 'y1', green: null });
    expect(payload[0]).toEqual({
      name: null,
      note: 'Work into a magic ring.',
      yarn_id: 'y1',
      stitch_unit: ['sc'],
      repeat_count: 6,
      end_count: 6,
      times: 1,
    });
    expect(payload.find((s) => s.name === 'Stem')?.yarn_id).toBeNull();
  });
});

describe('parsePattern', () => {
  it('rejects invalid JSON', () => {
    const result = parsePatternText('{ nope');
    expect(result.ok).toBe(false);
  });

  it('rejects other formats and newer versions', () => {
    expect(parseErrors({ format: 'something-else', version: 1 })[0]).toMatch(/Not a kNoted pattern/);
    expect(parseErrors(minimal([{}], { version: 2 }))[0]).toMatch(/version 2/);
  });

  it('requires a name and at least one step', () => {
    const errors = parseErrors({ format: 'knoted-pattern', version: 1, pattern: {}, steps: [] });
    expect(errors).toContain('Pattern: "name" is required.');
    expect(errors).toContain('"steps" must be a list with at least one step.');
  });

  it('rejects unknown stitches, bad numbers and unknown yarn keys', () => {
    const errors = parseErrors(
      minimal([
        { stitch_unit: ['sc', 'bobble'] },
        { stitch_unit: ['sc'], repeat_count: 0 },
        { stitch_unit: ['sc'], times: 1.5 },
        { stitch_unit: ['sc'], end_count: -1 },
        { stitch_unit: ['sc'], yarn: 'pink' },
      ]),
    );
    expect(errors).toHaveLength(5);
    expect(errors[0]).toMatch(/Step 1: unknown stitch "bobble"/);
    expect(errors[1]).toMatch(/Step 2: "repeat_count"/);
    expect(errors[2]).toMatch(/Step 3: "times"/);
    expect(errors[3]).toMatch(/Step 4: "end_count"/);
    expect(errors[4]).toMatch(/Step 5: yarn "pink"/);
  });

  it('rejects duplicate yarn keys and bad colours', () => {
    const errors = parseErrors(
      minimal([{ stitch_unit: [] }], {
        yarns: [
          { key: 'a', colour_name: 'A', colour_hex: '#FFF' },
          { key: 'a', colour_name: 'B' },
        ],
      }),
    );
    expect(errors).toEqual(['Yarn 1: "colour_hex" must look like #E8761E.', 'Yarn 2: key "a" is used twice.']);
  });

  it('fills defaults and ignores unknown keys', () => {
    const data = parseOk(minimal([{ stitch_unit: ['sc', 'inc'], repeat_count: 6, future_field: true }], { future: 1 }));
    expect(data.pattern.worked_in).toBe('rounds');
    expect(data.yarns).toEqual([]);
    expect(data.steps[0]).toEqual({
      name: null,
      note: null,
      yarn: null,
      stitch_unit: ['sc', 'inc'],
      repeat_count: 6,
      end_count: 18, // calculated, like the editor does
      times: 1,
    });
  });

  it('keeps times on named steps with nothing to count', () => {
    const data = parseOk(minimal([{ name: 'Shape segment', stitch_unit: [], repeat_count: 4, times: 6 }]));
    expect(data.steps[0]).toMatchObject({ name: 'Shape segment', stitch_unit: [], repeat_count: 1, times: 6 });
  });

  it('defaults a missing colour name to the key', () => {
    const data = parseOk(minimal([{ stitch_unit: [] }], { yarns: [{ key: 'cream' }] }));
    expect(data.yarns[0]).toEqual({ key: 'cream', colour_name: 'cream', colour_hex: null, used_for: null });
  });
});

describe('checkStitchCounts', () => {
  it('warns when a round makes a different count than stated', () => {
    const warnings = checkStitchCounts([round(['sc'], 6, 6), round(['sc', 'inc'], 6, 20)]);
    expect(warnings).toEqual([
      { step: 1, message: 'Makes 18 stitches, but the pattern says 20.' },
      { step: 1, message: 'Works into 12 stitches, but the previous round ends with 6.' },
    ]);
  });

  it('warns when a round works into more stitches than the previous one has', () => {
    const warnings = checkStitchCounts([round(['sc'], 6, 6), round(['inc'], 6, 12), round(['sc', 'inc'], 8, 24)], 'rows');
    expect(warnings).toEqual([{ step: 2, message: 'Works into 16 stitches, but the previous row ends with 12.' }]);
  });

  it('counts dec as two stitches worked and ch as none', () => {
    expect(checkStitchCounts([round(['sc'], 12, 12), round(['dec'], 6, 6)])).toEqual([]);
    expect(checkStitchCounts([round(['sc'], 6, 6), round(['sc', 'ch'], 6, 12)])).toEqual([]);
  });

  it('checks repeated rounds against themselves', () => {
    expect(checkStitchCounts([round(['sc'], 12, 12), round(['sc'], 12, 12, 5)])).toEqual([]);
    const warnings = checkStitchCounts([round(['sc'], 12, 12), round(['inc'], 12, 24, 2)]);
    expect(warnings).toEqual([{ step: 1, message: 'Repeated 2×, but each round works into 12 stitches and ends with 24.' }]);
  });

  it('skips named steps and non-countable steps in the chain', () => {
    const leaf: KnotedStep = { ...round(['sc'], 3, 3), name: 'Leaf' };
    const note: KnotedStep = { ...round([], 1, null), name: 'Stuff' };
    expect(checkStitchCounts([round(['sc'], 6, 6), leaf, note, round(['inc'], 6, 12)])).toEqual([]);
  });
});

describe('matchStashYarn', () => {
  it('matches colour names ignoring case and spaces', () => {
    const stash = [{ id: 'a', colour_name: 'Cream' }, { id: 'b', colour_name: ' orange ' }];
    expect(matchStashYarn({ key: 'o', colour_name: 'Orange', colour_hex: null, used_for: null }, stash)?.id).toBe('b');
    expect(matchStashYarn({ key: 'x', colour_name: 'Teal', colour_hex: null, used_for: null }, stash)).toBeNull();
  });
});

describe('buildExport', () => {
  it('round-trips through parsePattern', () => {
    const original = parseOk(JSON.parse(sampleText));
    const saved = toPreviewSteps(original.steps, { orange: 'y1', green: 'y2' });
    const stash = [
      { id: 'y1', colour_name: 'Orange', colour_hex: '#E8761E' },
      { id: 'y2', colour_name: 'Leaf Green', colour_hex: '#5E8C3A' },
    ];
    const exported = buildExport(
      { name: 'Little Pumpkin', hook_size: '4.5 mm', yarn_summary: 'Worsted #4 cotton', worked_in: 'rounds' },
      saved,
      stash,
    );

    expect(exported.yarns.map((y) => y.key)).toEqual(['orange', 'leaf-green']);
    const again = parseOk(JSON.parse(JSON.stringify(exported)));
    expect(again.steps.map((s) => ({ ...s, yarn: null }))).toEqual(original.steps.map((s) => ({ ...s, yarn: null })));
    expect(again.steps[0].yarn).toBe('orange');
    expect(again.steps.find((s) => s.name === 'Stem')?.yarn).toBe('leaf-green');
  });

  it('gives yarns with the same colour name distinct keys', () => {
    const steps = toPreviewSteps([{ ...round(['sc'], 6, 6), yarn: 'a' }, { ...round(['sc'], 6, 6), yarn: 'b' }], { a: 'y1', b: 'y2' });
    const exported = buildExport(
      { name: 'T', hook_size: null, yarn_summary: null, worked_in: 'rounds' },
      steps,
      [{ id: 'y1', colour_name: 'Cream', colour_hex: '#FFFFFF' }, { id: 'y2', colour_name: 'Cream', colour_hex: '#FFFFF0' }],
    );
    expect(exported.yarns.map((y) => y.key)).toEqual(['cream', 'cream-2']);
  });
});
