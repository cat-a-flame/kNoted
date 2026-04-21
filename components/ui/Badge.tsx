type BadgeVariant = 'inProgress' | 'done' | 'archived';

interface BadgeProps {
  variant: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  inProgress: 'bg-teal-light text-teal-dark border border-teal/20',
  done: 'bg-surface-2 text-text-secondary border border-black/[0.09]',
  archived: 'bg-amber-light text-amber border border-amber/20',
};

const labels: Record<BadgeVariant, string> = {
  inProgress: 'In progress',
  done: 'Done',
  archived: 'Archived',
};

export function Badge({ variant }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${variantClasses[variant]}`}>
      {labels[variant]}
    </span>
  );
}
