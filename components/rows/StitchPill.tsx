import { Stitch } from '@/lib/types';
import { STITCHES } from '@/lib/stitches';
import { Tooltip } from '@/components/ui/Tooltip';

interface StitchPillProps {
  stitch: Stitch;
}

export function StitchPill({ stitch }: StitchPillProps) {
  const def = STITCHES.find((s) => s.name === stitch.name);

  const pill = (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-light text-teal-dark text-xs font-medium rounded-sm border border-teal/20">
      <span>{stitch.count}×</span>
      <span>{stitch.name}</span>
    </span>
  );

  if (def) {
    return <Tooltip content={def.desc}>{pill}</Tooltip>;
  }

  return pill;
}
