interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({ value, max = 100, className = '' }: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);

  return (
    <div className={`h-2 rounded-full bg-surface-2 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-teal transition-all duration-300"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
