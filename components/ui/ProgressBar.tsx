import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({ value, max = 100, className = '' }: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);

  return (
    <div className={`${styles.track} ${className}`}>
      <div
        className={styles.fill}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
