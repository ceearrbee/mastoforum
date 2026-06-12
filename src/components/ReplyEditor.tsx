import { useEffect, useRef, useState } from 'react';
import {
  Button,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Attachment, Close } from '@carbon/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { useSettings, type VisibilityType } from '../context/SettingsContext';
import { clearDraft, getDraft, saveDraft } from '../utils/drafts';
import { errorMessage } from '../utils/apiErrors';
import { stripHtml, truncate } from '../utils/sanitize';
import { graphemeLength } from '../utils/text';
import { getMaxCharacters, getMediaLimits, supportsLocalOnly } from '../utils/instanceConfig';
import { cleanPollOptions, isPollValid } from '../utils/poll';
import { createStatusWithLocalFallback } from '../utils/composeStatus';
import CharCounter from './CharCounter';
import ComposerEditor from './ComposerEditor';
import PollComposer, { type PollDraft } from './PollComposer';
import ScheduleField from './ScheduleField';
import styles from './ReplyEditor.module.css';

type ComposerVisibility = VisibilityType | 'local';

interface PendingAttachment {
  id: string;
  file: File;
  description: string;
  attachmentId?: string;
  uploading: boolean;
  error?: string;
  previewUrl: string;
}

interface Props {
  /** The root status id of the thread. */
  threadId: string;
  /** When set, the reply targets this specific post (not the root). */
  replyTo?: mastodon.v1.Status | null;
  onClearReplyTo?: () => void;
}

function buildQuotePrefill(target: mastodon.v1.Status): string {
  const handle = target.account.acct;
  const text = truncate(stripHtml(target.content), 240);
  const quoted = text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return `@${handle}\n${quoted}\n\n`;
}

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

export default function ReplyEditor({ threadId, replyTo, onClearReplyTo }: Props) {
  const { client } = useAuth();
  const { settings } = useSettings();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from a saved draft for this thread, if any.
  const initialDraft = getDraft(threadId);
  const [content, setContent] = useState(initialDraft?.content ?? '');
  const [spoilerText, setSpoilerText] = useState(initialDraft?.spoilerText ?? '');
  const [visibility, setVisibility] = useState<ComposerVisibility>(settings.defaultVisibility);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sensitive, setSensitive] = useState(false);
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [hadDraft, setHadDraft] = useState(!!initialDraft);

  // Persist the draft as the user types (debounced via React batching).
  useEffect(() => {
    saveDraft(threadId, { content, spoilerText });
  }, [threadId, content, spoilerText]);

  // Prefill a quoted block when the reply target changes. Done as
  // derived-state-during-render so each new target only prepends once.
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (replyTo && replyTo.id !== prefilledFor) {
    setPrefilledFor(replyTo.id);
    setContent((prev) => `${buildQuotePrefill(replyTo)}${prev}`);
  } else if (!replyTo && prefilledFor !== null) {
    setPrefilledFor(null);
  }

  const { imageSizeLimit: imageLimit, videoSizeLimit: videoLimit } = getMediaLimits();

  const uploadFile = async (file: File): Promise<mastodon.v1.MediaAttachment> => {
    if (!client) throw new Error('Not authenticated');
    const isVideo = file.type.startsWith('video/');
    const cap = isVideo ? videoLimit : imageLimit;
    if (file.size > cap) {
      throw new Error(`File exceeds instance limit (${mb(cap)})`);
    }
    return client.v2.media.create({ file });
  };

  const onFilesPicked = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).slice(0, 4 - attachments.length);
    for (const file of files) {
      const id = crypto.randomUUID();
      const pending: PendingAttachment = {
        id,
        file,
        description: '',
        uploading: true,
        previewUrl: URL.createObjectURL(file),
      };
      setAttachments((prev) => [...prev, pending]);
      uploadFile(file)
        .then((attachment) => {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === id ? { ...a, attachmentId: attachment.id, uploading: false } : a,
            ),
          );
        })
        .catch((err: unknown) => {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === id
                ? {
                    ...a,
                    uploading: false,
                    error: errorMessage(err, 'Upload failed'),
                  }
                : a,
            ),
          );
        });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const updateDescription = (id: string, description: string) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, description } : a)));
  };

  const anyUploading = attachments.some((a) => a.uploading);
  const readyAttachmentIds = attachments
    .filter((a) => a.attachmentId)
    .map((a) => a.attachmentId!);

  const maxChars = getMaxCharacters();
  const remaining = maxChars - (graphemeLength(content) + graphemeLength(spoilerText));
  const overLimit = remaining < 0;
  const pollOk = !poll || isPollValid(poll.options);
  const showLocalVisibility = settings.showAdvancedVisibilities && supportsLocalOnly();

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error('Not authenticated');
      if (!content.trim() && readyAttachmentIds.length === 0 && !poll) {
        throw new Error('Reply needs content, a poll, or an attachment');
      }
      if (poll && !isPollValid(poll.options)) {
        throw new Error('A poll needs at least two distinct, non-empty options');
      }
      await Promise.all(
        attachments
          .filter((a) => a.attachmentId && a.description.trim())
          .map((a) =>
            client.v1.media
              .$select(a.attachmentId!)
              .update({ description: a.description.trim() })
              .catch(() => undefined),
          ),
      );
      const params: Record<string, unknown> = {
        status: content,
        inReplyToId: replyTo?.id ?? threadId,
        visibility,
        spoilerText,
      };
      if (readyAttachmentIds.length > 0) {
        params.mediaIds = readyAttachmentIds;
        if (sensitive) params.sensitive = true;
      }
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
    },
    onSuccess: () => {
      setContent('');
      setSpoilerText('');
      setError('');
      setSuccess(scheduledAt ? `Reply scheduled for ${new Date(scheduledAt).toLocaleString()}` : '');
      setScheduledAt('');
      setSensitive(false);
      setPoll(null);
      attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      setAttachments([]);
      setPrefilledFor(null);
      setHadDraft(false);
      clearDraft(threadId);
      onClearReplyTo?.();
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    },
    onError: (err: unknown) => {
      setError(errorMessage(err, 'Failed to post reply'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    postMutation.mutate();
  };

  const canSubmit =
    !postMutation.isPending &&
    !anyUploading &&
    !overLimit &&
    pollOk &&
    (content.trim().length > 0 || readyAttachmentIds.length > 0 || !!poll);

  return (
    <div className={styles.wrap}>
      <header className={styles.heading}>
        <h2 className={styles.headingTitle}>
          {replyTo ? 'Reply with quote' : 'Post a reply'}
        </h2>
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.replyTo}>
              Replying to <strong>@{replyTo.account.acct}</strong>
            </span>
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription="Clear reply target"
              tooltipAlignment="end"
              renderIcon={Close}
              onClick={() => {
                onClearReplyTo?.();
                setPrefilledFor(null);
              }}
            />
          </div>
        )}
      </header>

      {hadDraft && (
        <div style={{ padding: '0.5rem 1.25rem' }}>
          <InlineNotification
            kind="info"
            title="Draft restored"
            subtitle="Your previous reply was loaded from this device."
            lowContrast
            onCloseButtonClick={() => setHadDraft(false)}
          />
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <TextInput
          id="reply-title"
          labelText="Subject / content warning (optional)"
          placeholder="e.g. chapter 2, spoilers, language"
          value={spoilerText}
          onChange={(e) => setSpoilerText(e.target.value)}
          disabled={postMutation.isPending}
        />

        <div style={{ color: 'var(--cds-text-primary)', position: 'relative' }}>
          <ComposerEditor value={content} onChange={setContent} placeholder="Write your reply…" />
        </div>

        <div className={styles.mediaBar}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Attachment size={16} aria-hidden="true" />
            Up to {mb(imageLimit)} images / {mb(videoLimit)} video, max 4 attachments.
          </span>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Attachment}
            disabled={attachments.length >= 4 || postMutation.isPending || !!poll}
            onClick={() => fileInputRef.current?.click()}
          >
            Add media
          </Button>
          <input
            ref={fileInputRef}
            aria-label="Add media"
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => onFilesPicked(e.target.files)}
          />
        </div>

        <PollComposer
          value={poll}
          onChange={setPoll}
          disabled={postMutation.isPending || attachments.length > 0}
        />

        {attachments.length > 0 && (
          <ul className={styles.attachments} aria-label="Pending attachments">
            {attachments.map((a) => (
              <li key={a.id} className={styles.attachment}>
                <div className={styles.attachmentHeader}>
                  <span className={styles.attachmentName}>{a.file.name}</span>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    iconDescription="Remove"
                    tooltipAlignment="end"
                    renderIcon={Close}
                    onClick={() => removeAttachment(a.id)}
                  />
                </div>
                {a.file.type.startsWith('image/') && (
                  <img src={a.previewUrl} alt="" className={styles.attachmentImg} />
                )}
                {a.uploading && <InlineLoading description="Uploading…" />}
                {a.error && (
                  <InlineNotification
                    kind="error"
                    title="Upload failed"
                    subtitle={a.error}
                    lowContrast
                    hideCloseButton
                  />
                )}
                {a.attachmentId && (
                  <TextInput
                    id={`alt-${a.id}`}
                    labelText="Alt text"
                    placeholder="Describe this media for screen readers"
                    value={a.description}
                    onChange={(e) => updateDescription(a.id, e.target.value)}
                    size="sm"
                    warn={!a.description.trim()}
                    warnText="No alt text yet — screen-reader users won't know what this shows."
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        {attachments.length > 0 && (
          <Toggle
            id="reply-sensitive"
            size="sm"
            labelText="Mark media as sensitive"
            toggled={sensitive}
            onToggle={setSensitive}
            disabled={postMutation.isPending}
          />
        )}

        <ScheduleField
          value={scheduledAt}
          onChange={setScheduledAt}
          disabled={postMutation.isPending}
          label="Schedule this reply for later (optional)"
        />

        {error && (
          <InlineNotification
            kind="error"
            title="Could not post"
            subtitle={error}
            lowContrast
            onCloseButtonClick={() => setError('')}
          />
        )}

        {success && (
          <InlineNotification
            kind="success"
            title="Scheduled"
            subtitle={success}
            lowContrast
            onCloseButtonClick={() => setSuccess('')}
          />
        )}

        <div className={styles.footer}>
          <div className={styles.visibility}>
            <Select
              id="reply-visibility"
              labelText="Visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as typeof visibility)}
              disabled={postMutation.isPending}
            >
              <SelectItem value="public" text="Public" />
              <SelectItem value="unlisted" text="Unlisted" />
              <SelectItem value="private" text="Followers only" />
              <SelectItem value="direct" text="Direct message" />
              {showLocalVisibility && <SelectItem value="local" text="Local only" />}
            </Select>
          </div>

          <div className={styles.submitGroup}>
            {postMutation.isPending && <InlineLoading description="Posting…" />}
            <CharCounter remaining={remaining} />
            <Button type="submit" disabled={!canSubmit}>
              Post reply
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
