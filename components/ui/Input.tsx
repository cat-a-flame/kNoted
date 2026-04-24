import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: 'sm' | 'md';
}

export function Input({ inputSize, className, ...props }: InputProps) {
  return (
    <input
      className={`${styles.input} ${inputSize === 'sm' ? styles.sm : ''} ${className ?? ''}`}
      {...props}
    />
  );
}
