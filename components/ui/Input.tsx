import styles from './Input.module.css';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${styles.input} ${className ?? ''}`} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${styles.input} ${styles.textarea} ${className ?? ''}`} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${styles.input} ${className ?? ''}`} {...props} />;
}
