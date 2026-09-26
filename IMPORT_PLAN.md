# kNoted — Pattern import: plan for Claude Code

## Goal

Let a user import a pattern from a `.knoted.json` file (format below) instead of typing every step into the editor. After import, the pattern opens in the existing tracker, where `expandSteps()` already turns a step with `times: 9` into nine tracker entries, so repeated rounds show up one by one.

The format mirrors what `PatternEditor` already sends to `replace_pattern_steps`, so the importer is mostly validation and yarn mapping, not a new data model.

## The file format (`knoted-pattern`, version 1)

```jsonc
{
  "format": "knoted-pattern",
  "version": 1,
  "pattern": {
    "name": "Little Pumpkin",          // required
    "designer": "…",                    // optional, informational
    "hook_size": "4.5 mm",              // -> patterns.hook_size
    "yarn_summary": "Worsted #4 cotton",// -> patterns.yarn_summary
    "worked_in": "rounds"               // "rounds" | "rows"
  },
  "yarns": [                            // colours the pattern needs, mapped to the stash on import
    { "key": "orange", "colour_name": "Orange", "colour_hex": "#E8761E", "used_for": "Body" }
  ],
  "steps": [
    {
      "name": null,                     // null/absent = auto-numbered "Round n"; a string = named, unnumbered step
      "note": "Optional note",
      "yarn": "orange",                 // key into `yarns`, or absent
      "stitch_unit": ["sc", "inc"],     // the bracketed unit; [] = nothing to count (finishing steps)
      "repeat_count": 8,                // how many times the unit goes around
      "end_count": 24,                  // stitches at the end of the round
      "times": 1                        // identical consecutive rounds (R13–21 = 9)
    }
  ]
}
```

Rules: `stitch_unit` values must be in the existing `StitchType` list. `times` ≥ 1. Unknown top-level keys are ignored (forward-compatible).

## Import flow

1. **Entry point**: an "Import pattern" button on `/patterns` next to "New pattern", opening `/patterns/import`.
2. **Load**: file picker (and a paste-JSON textarea as a fallback). Parse client-side.
3. **Validate** (pure function in `lib/import.ts`, unit-testable):
   - Schema check: required fields, allowed stitch types, positive integers. Hard errors block import.
   - Stitch-count check, walking the numbered rounds in order: `made = Σ produces × repeat` should equal `end_count`, and `used = Σ consumes × repeat` should equal the previous round's `end_count` (consumes: sc/hdc/dc/tr/dtr/inc = 1, dec = 2, ch = 0). Mismatches are **warnings**, shown next to the step, not blockers. Patterns have typos and special stitches (e.g. "3 sc in the same stitch"), so the user decides.
4. **Map yarns**: for each entry in `yarns`, let the user pick a stash yarn (pre-select one whose colour name matches, case-insensitive), create a new stash yarn from the file's name/hex, or leave unassigned.
5. **Preview**: render the expanded list with `expandSteps()` so the user sees exactly what the tracker will show (Round 1…26, "Shape segment (1)…(6)", etc.), plus the warnings.
6. **Save**: insert into `patterns`, then call the existing `replace_pattern_steps` RPC with the mapped `yarn_id`s. Redirect to `/patterns/[id]`.

## Changes needed in existing code

- **Named, non-countable steps with `times > 1`**: the editor currently forces `times` to 1 when `stitch_unit` is empty (`handleSave` and `autoLabels`). The tracker already handles it ("Shape segment (3)"). Allow `times` for named steps in the editor so these survive a re-save, and show the "Same step in a row" field for them.
- **Export** (small, worth doing together): an "Export" action on the pattern page that writes the same format, so it round-trips and gives a way to back up patterns.
- **Optional, later**: a per-step `consumes_override` (or a "worked into the same stitch" flag) so validation stops warning on legitimate special stitches.

## Nice-to-haves (separate PRs)

- Generate the JSON from a PDF: upload a pattern PDF, send it to the Claude API with the format spec as instructions, then land on the same preview/warnings screen. Keep the user in the loop: the preview step is the review.
- Show the original round label ("R13–21") in the tracker's stretch label. `expandSteps` already builds this.

## Non-goals

- No change to the tracker's progress model (`current_step` / `current_stitch`).
- No storing of pattern PDFs or original pattern text.

## Suggested prompt for Claude Code

> Read `IMPORT_PLAN.md`, `lib/types.ts`, `lib/track.ts`, `lib/stitches.ts`, `supabase/schema.sql` and `components/patterns/PatternEditor.tsx`. Implement the import flow in phases: (1) `lib/import.ts` with parsing + validation + tests using `samples/little-pumpkin.knoted.json`, (2) the `/patterns/import` page with yarn mapping and an `expandSteps` preview, (3) allow `times` on named non-countable steps in the editor, (4) export. Stop after each phase so I can review. Match the existing CSS-module style and UI components.
