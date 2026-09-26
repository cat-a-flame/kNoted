import type { StitchType } from '@/lib/types';
import { STITCHES } from '@/lib/stitches';
import styles from './StitchLayout.module.css';

type Props = {
  unit: StitchType[];
  actionsTotal: number;
  stitchesMade: number;
  shape: 'ring' | 'rows';
  title: string;
};

const SIZE = 300;
const CENTER = SIZE / 2;
const RADIUS = 120;

/** Colour + size for mark i: done marks are solid, the next one is larger with an outline, the rest are a light tint. */
function markStyle(unit: StitchType[], i: number, stitchesMade: number, baseR: number) {
  const s = STITCHES[unit[i % unit.length]];
  const isNext = i === stitchesMade;
  const isMade = i < stitchesMade;
  return {
    r: isNext ? baseR * 1.36 : baseR,
    fill: isMade || isNext ? s.strong : s.light,
    stroke: isNext ? '#332A22' : 'none',
    strokeWidth: isNext ? 2 : 0,
  };
}

export function StitchLayout({ unit, actionsTotal, stitchesMade, shape, title }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Stitch layout</span>
        {[...new Set(unit)].map((t) => (
          <span key={t} className={styles.legendItem}>
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill={STITCHES[t].strong} /></svg>
            {STITCHES[t].abbr}
          </span>
        ))}
      </div>

      {shape === 'ring' ? (
        <Ring unit={unit} actionsTotal={actionsTotal} stitchesMade={stitchesMade} title={title} />
      ) : (
        <Rows unit={unit} actionsTotal={actionsTotal} stitchesMade={stitchesMade} title={title} />
      )}
    </div>
  );
}

function Ring({ unit, actionsTotal, stitchesMade, title }: Omit<Props, 'shape'>) {
  // Shrink marks for big rounds so neighbours never overlap.
  const spacing = (2 * Math.PI * RADIUS) / Math.max(actionsTotal, 1);
  const baseR = Math.min(5.5, spacing * 0.34);

  return (
    <div className={styles.ring}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.ringSvg} role="img" aria-label={`${stitchesMade} of ${actionsTotal} stitches made`}>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#EFEBE3" strokeWidth="1" />
        {Array.from({ length: actionsTotal }, (_, i) => {
          const angle = -Math.PI / 2 + (i / actionsTotal) * Math.PI * 2;
          const m = markStyle(unit, i, stitchesMade, baseR);
          return (
            <circle
              key={i}
              cx={CENTER + RADIUS * Math.cos(angle)}
              cy={CENTER + RADIUS * Math.sin(angle)}
              r={m.r}
              fill={m.fill}
              stroke={m.stroke}
              strokeWidth={m.strokeWidth}
            />
          );
        })}
      </svg>
      <div className={styles.ringCenter}>
        <div className={styles.ringCount}>
          {stitchesMade}
          <span className={styles.ringTotal}> / {actionsTotal}</span>
        </div>
        <div className={styles.ringTitle}>{title}</div>
      </div>
    </div>
  );
}

/** Flat work: the row laid out left to right, wrapping every `perLine` stitches. */
function Rows({ unit, actionsTotal, stitchesMade, title }: Omit<Props, 'shape'>) {
  const perLine = actionsTotal <= 24 ? actionsTotal : Math.ceil(actionsTotal / Math.ceil(actionsTotal / 24));
  const gap = 20;
  const baseR = 5.5;
  const lines = Math.ceil(actionsTotal / perLine);
  const width = perLine * gap;
  const height = lines * gap;

  return (
    <div className={styles.rows}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.rowsSvg} style={{ maxWidth: width * 1.2 }} role="img" aria-label={`${stitchesMade} of ${actionsTotal} stitches made`}>
        {Array.from({ length: actionsTotal }, (_, i) => {
          const m = markStyle(unit, i, stitchesMade, baseR);
          return (
            <circle
              key={i}
              cx={(i % perLine) * gap + gap / 2}
              cy={Math.floor(i / perLine) * gap + gap / 2}
              r={m.r}
              fill={m.fill}
              stroke={m.stroke}
              strokeWidth={m.strokeWidth}
            />
          );
        })}
      </svg>
      <div className={styles.rowsCaption}>
        <span className={styles.ringCount}>
          {stitchesMade}
          <span className={styles.ringTotal}> / {actionsTotal}</span>
        </span>
        <span className={styles.ringTitle}>{title}</span>
      </div>
    </div>
  );
}
