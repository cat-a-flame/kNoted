import styles from './FormLabel.module.css';

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  variant?: 'default' | 'meta';
  children: React.ReactNode;
}

export function FormLabel({ variant = 'default', children, ...props }: FormLabelProps) {
  return (
    <label className={variant === 'meta' ? styles.meta : styles.label} {...props}>
      {children}
    </label>
  );
}
