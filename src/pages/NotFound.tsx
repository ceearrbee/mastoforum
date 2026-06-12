import { Link } from 'react-router-dom';
import styles from './StaticDoc.module.css';

export default function NotFound() {
  return (
    <main className={styles.doc}>
      <h1>Page not found</h1>
      <p>This URL doesn't match any route in this app.</p>
      <p>
        <Link to="/">← Back to home</Link>
      </p>
    </main>
  );
}
