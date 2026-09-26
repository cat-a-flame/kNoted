import styles from './FormLabel.module.css';

export function FormLabel({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={styles.label} {...props}>
      {children}
    </label>
  );
}
