import styles from './CoverPlaceholder.module.css';

export function CoverPlaceholder({ iconSize = 32 }: { iconSize?: number }) {
  return (
    <div className={styles.placeholder}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        stroke="#9BBFBA"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="16" cy="16" r="11" />
        <path d="M5 16c4-5 8-7 11-7s7 2 11 7" />
        <path d="M5 16c4 5 8 7 11 7s7-2 11-7" />
        <path d="M16 5c-3 4-3 8-3 11s0 7 3 11" />
        <path d="M16 5c3 4 3 8 3 11s0 7-3 11" />
      </svg>
    </div>
  );
}
