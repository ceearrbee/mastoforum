import { useState } from 'react';
import styles from './AvatarChip.module.css';

type Size = 'sm' | 'md' | 'lg';

interface AvatarAccount {
  avatar?: string | null;
  displayName: string;
  username: string;
}

interface Props {
  account: AvatarAccount;
  size?: Size;
  title?: string;
}

export default function AvatarChip({ account, size = 'md', title }: Props) {
  const [failed, setFailed] = useState(false);
  const fallback = (account.displayName || account.username || '?').charAt(0).toUpperCase();
  const showImg = account.avatar && !failed;

  return (
    <span
      className={`${styles.avatar} ${styles[`size-${size}`]}`}
      aria-hidden="true"
      title={title}
    >
      {showImg ? (
        <img
          src={account.avatar ?? undefined}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
