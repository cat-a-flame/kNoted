import { Stitch } from '@/lib/types';
import { STITCHES } from '@/lib/stitches';
import { Tooltip } from '@/components/ui/Tooltip';
import styles from './StitchPill.module.css';

interface StitchPillProps {
  stitch: Stitch;
}

export function StitchPill({ stitch }: StitchPillProps) {
  const def = STITCHES.find((s) => s.name === stitch.name);

  const pill = (
    <span className={styles.pill}>
      <span>{stitch.count}×</span>
      <span>{stitch.name}</span>
    </span>
  );

  if (def) {
    return <Tooltip content={def.desc}>{pill}</Tooltip>;
  }

  return pill;
}
