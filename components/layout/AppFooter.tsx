import Link from 'next/link';
import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link href="/patterns" className={styles.brand}>kNoted</Link>
        <span className={styles.tagline}>Your crochet notebook</span>
      </div>
    </footer>
  );
}
