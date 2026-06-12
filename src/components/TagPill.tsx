import { Link } from 'react-router-dom';
import styles from './TagPill.module.css';

interface Props {
  name: string;
}

export default function TagPill({ name }: Props) {
  return (
    <Link
      to={`/board/${encodeURIComponent(name)}`}
      className={styles.pill}
      onClick={(e) => e.stopPropagation()}
    >
      #{name}
    </Link>
  );
}
