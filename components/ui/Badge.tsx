import styles from './Badge.module.css';

type BadgeVariant = 'inProgress' | 'done' | 'archived';

interface BadgeProps {
  variant: BadgeVariant;
}

const labels: Record<BadgeVariant, string> = {
  inProgress: 'In progress',
  done: 'Done',
  archived: 'Archived',
};

export function Badge({ variant }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {labels[variant]}
    </span>
  );
}
