import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, InlineNotification, Loading } from '@carbon/react';
import PageHeading from '../components/PageHeading';
import { handleMastodonCallback } from '../utils/auth';
import { errorMessage } from '../utils/apiErrors';
import { useAuth } from '../context/AuthContext';
import styles from './AuthCallback.module.css';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const [error, setError] = useState<string | null>(code ? null : 'No authorization code received from instance.');

  useEffect(() => {
    if (!code) return;
    // Guard against a hung instance leaving the spinner up forever.
    const timeout = setTimeout(
      () => setError('Sign-in timed out. Your instance may be slow or unreachable — try again.'),
      30_000,
    );
    handleMastodonCallback(code, state)
      .then(() => {
        clearTimeout(timeout);
        refresh();
        navigate('/', { replace: true });
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        setError(errorMessage(err, 'Authentication failed'));
      });
    return () => clearTimeout(timeout);
  }, [code, state, navigate, refresh]);

  if (error) {
    return (
      <div className={styles.errorPage}>
        <PageHeading>Authentication error</PageHeading>
        <InlineNotification
          kind="error"
          title="Sign-in failed"
          subtitle={error}
          lowContrast
          hideCloseButton
        />
        <div className={styles.actions}>
          <Button onClick={() => navigate('/', { replace: true })}>Return home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loadingPage}>
      <Loading description="Authenticating" withOverlay={false} />
      <span>Signing you in…</span>
    </div>
  );
}
