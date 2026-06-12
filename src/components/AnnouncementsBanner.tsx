import { useState } from 'react';
import { Button } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import SanitizedHtml from './SanitizedHtml';
import styles from './AnnouncementsBanner.module.css';

// Mastodon returns a `read` flag on announcements for authorized requests, but
// masto's type omits it; widen locally so we can hide already-read ones.
type AnnouncementWithRead = mastodon.v1.Announcement & { read?: boolean };

/** Unread server announcements as dismissable banners on Home; dismiss marks them read. */
export default function AnnouncementsBanner() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data = [] } = useQuery<AnnouncementWithRead[]>({
    queryKey: ['announcements'],
    queryFn: async () => await requireClient(client).v1.announcements.list(),
    enabled: !!client,
    staleTime: 5 * 60_000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => requireClient(client).v1.announcements.$select(id).dismiss(),
    onMutate: (id: string) => setDismissed((prev) => new Set(prev).add(id)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const visible = data.filter((a) => !a.read && !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <section className={styles.stack} aria-label="Announcements">
      {visible.map((a) => (
        <div key={a.id} className={styles.banner}>
          <SanitizedHtml className={styles.content} html={a.content} emojis={a.emojis} />
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            iconDescription="Dismiss announcement"
            renderIcon={Close}
            className={styles.dismiss}
            disabled={dismiss.isPending}
            onClick={() => dismiss.mutate(a.id)}
          />
        </div>
      ))}
    </section>
  );
}
