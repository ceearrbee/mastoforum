import { useState } from 'react';
import {
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  TextInput,
} from '@carbon/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { useSettings, type VisibilityType } from '../context/SettingsContext';
import { graphemeLength } from '../utils/text';
import { errorMessage } from '../utils/apiErrors';
import { getMaxCharacters, supportsLocalOnly } from '../utils/instanceConfig';
import { cleanPollOptions, isPollValid } from '../utils/poll';
import { createStatusWithLocalFallback } from '../utils/composeStatus';
import CharCounter from './CharCounter';
import ComposerEditor from './ComposerEditor';
import PollComposer, { type PollDraft } from './PollComposer';
import ScheduleField from './ScheduleField';
import styles from './StatusComposerModal.module.css';

type ComposerVisibility = VisibilityType | 'local';

export type ComposerMode =
  | { kind: 'new-topic'; tag: string }
  | { kind: 'edit'; status: mastodon.v1.Status };

interface Props {
  open: boolean;
  onClose: () => void;
  mode: ComposerMode;
}

export default function StatusComposerModal({ open, onClose, mode }: Props) {
  const { client } = useAuth();
  const { settings } = useSettings();
  const queryClient = useQueryClient();

  const sessionKey = open
    ? mode.kind === 'edit'
      ? `edit:${mode.status.id}:${mode.status.editedAt ?? mode.status.createdAt}`
      : `new:${mode.tag}`
    : 'closed';

  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [spoilerText, setSpoilerText] = useState('');
  const [visibility, setVisibility] = useState<ComposerVisibility>(settings.defaultVisibility);
  const [scheduledAt, setScheduledAt] = useState('');
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [error, setError] = useState('');

  // Re-seed during render whenever the open session changes.
  if (open && seededFor !== sessionKey) {
    setSeededFor(sessionKey);
    if (mode.kind === 'edit') {
      setContent(mode.status.text ?? '');
      setSpoilerText(mode.status.spoilerText ?? '');
      setVisibility(mode.status.visibility as ComposerVisibility);
    } else {
      setContent(`#${mode.tag} `);
      setSpoilerText('');
      setVisibility(settings.defaultVisibility);
    }
    setScheduledAt('');
    setPoll(null);
    setError('');
  } else if (!open && seededFor !== null) {
    setSeededFor(null);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('Not authenticated');
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Post content cannot be empty');
      if (mode.kind === 'new-topic') {
        if (poll && !isPollValid(poll.options)) {
          throw new Error('A poll needs at least two distinct, non-empty options');
        }
        const params: Record<string, unknown> = {
          status: trimmed,
          visibility,
          spoilerText,
        };
        if (poll) {
          params.poll = {
            options: cleanPollOptions(poll.options),
            expiresIn: poll.expiresIn,
            multiple: poll.multiple,
            hideTotals: poll.hideTotals,
          };
        }
        if (scheduledAt) {
          params.scheduledAt = new Date(scheduledAt).toISOString();
        }
        return createStatusWithLocalFallback(client, params);
      }
      return client.v1.statuses
        .$select(mode.status.id)
        .update({ status: trimmed, spoilerText });
    },
    onSuccess: (status) => {
      if (mode.kind === 'new-topic') {
        queryClient.invalidateQueries({ queryKey: ['board', mode.tag] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['thread'] });
      }
      void status;
      onClose();
    },
    onError: (err: unknown) => {
      setError(errorMessage(err, 'Could not post'));
    },
  });

  const title = mode.kind === 'new-topic' ? `New topic in #${mode.tag}` : 'Edit post';
  const submitText = mode.kind === 'new-topic' ? 'Post topic' : 'Save changes';

  const maxChars = getMaxCharacters();
  const remaining = maxChars - (graphemeLength(content) + graphemeLength(spoilerText));
  const overLimit = remaining < 0;
  const pollOk = !poll || isPollValid(poll.options);
  const showLocalVisibility = settings.showAdvancedVisibilities && supportsLocalOnly();

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      onRequestSubmit={() => mutation.mutate()}
      modalHeading={title}
      primaryButtonText={mutation.isPending ? 'Posting…' : submitText}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={mutation.isPending || !content.trim() || overLimit || !pollOk}
      size="md"
    >
      <div className={styles.body}>
        <TextInput
          id="compose-spoiler"
          labelText="Subject / content warning (optional)"
          placeholder="e.g. chapter 2, spoilers, language"
          value={spoilerText}
          onChange={(e) => setSpoilerText(e.target.value)}
          disabled={mutation.isPending}
        />
        <div className={`${styles.editor} ${styles.editorWrap}`}>
          <ComposerEditor value={content} onChange={setContent} placeholder="Write your post…" />
        </div>
        <div className={styles.counterRow}>
          <CharCounter remaining={remaining} />
        </div>
        {mode.kind === 'new-topic' && (
          <PollComposer value={poll} onChange={setPoll} disabled={mutation.isPending} />
        )}
        <Select
          id="compose-visibility"
          labelText="Visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as ComposerVisibility)}
          disabled={mutation.isPending || mode.kind === 'edit'}
        >
          <SelectItem value="public" text="Public" />
          <SelectItem value="unlisted" text="Unlisted" />
          <SelectItem value="private" text="Followers only" />
          <SelectItem value="direct" text="Direct message" />
          {showLocalVisibility && mode.kind === 'new-topic' && (
            <SelectItem value="local" text="Local only" />
          )}
        </Select>
        {mode.kind === 'edit' && (
          <p className={styles.hint}>Visibility cannot be changed after posting.</p>
        )}
        {mode.kind === 'new-topic' && (
          <ScheduleField
            value={scheduledAt}
            onChange={setScheduledAt}
            disabled={mutation.isPending}
          />
        )}
        {error && (
          <InlineNotification
            kind="error"
            title="Post failed"
            subtitle={error}
            lowContrast
            onCloseButtonClick={() => setError('')}
          />
        )}
      </div>
    </Modal>
  );
}
