import { useState } from 'react';
import {
  Button,
  Checkbox,
  InlineLoading,
  InlineNotification,
  Select,
  SelectItem,
  TextInput,
  Toggle,
} from '@carbon/react';
import { Add, TrashCan } from '@carbon/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { errorMessage } from '../utils/apiErrors';
import ConfirmModal from './ConfirmModal';
import styles from './FiltersPanel.module.css';

const CONTEXTS: mastodon.v2.FilterContext[] = [
  'home',
  'notifications',
  'public',
  'thread',
  'account',
];

const EXPIRY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Never', value: '' },
  { label: '30 minutes', value: '1800' },
  { label: '1 hour', value: '3600' },
  { label: '6 hours', value: '21600' },
  { label: '1 day', value: '86400' },
  { label: '7 days', value: '604800' },
];

interface FormState {
  editingId: string | null;
  title: string;
  keyword: string;
  keywordId: string | null;
  wholeWord: boolean;
  contexts: mastodon.v2.FilterContext[];
  action: mastodon.v2.FilterAction;
  expiresIn: string;
}

const blankForm: FormState = {
  editingId: null,
  title: '',
  keyword: '',
  keywordId: null,
  wholeWord: true,
  contexts: ['home', 'public'],
  action: 'warn',
  expiresIn: '',
};

/** Manage server-side keyword filters (`v2.filters`); shown as a Settings tab. */
export default function FiltersPanel() {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(blankForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<mastodon.v2.Filter | null>(null);

  const { data: filters = [], isLoading } = useQuery<mastodon.v2.Filter[]>({
    queryKey: ['filters'],
    queryFn: async () => await requireClient(client).v2.filters.list(),
    enabled: !!client,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['filters'] });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const expiresIn = f.expiresIn ? Number(f.expiresIn) : null;
      if (f.editingId) {
        return requireClient(client).v2.filters.$select(f.editingId).update({
          title: f.title,
          context: f.contexts,
          filterAction: f.action,
          expiresIn,
          keywordsAttributes: f.keyword.trim()
            ? [{ id: f.keywordId ?? undefined, keyword: f.keyword.trim(), wholeWord: f.wholeWord }]
            : undefined,
        });
      }
      return requireClient(client).v2.filters.create({
        title: f.title,
        context: f.contexts,
        filterAction: f.action,
        expiresIn,
        keywordsAttributes: f.keyword.trim()
          ? [{ keyword: f.keyword.trim(), wholeWord: f.wholeWord }]
          : undefined,
      });
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm(blankForm);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (filterId: string) => requireClient(client).v2.filters.$select(filterId).remove(),
    onSuccess: invalidate,
    onError: (err) => setError(errorMessage(err)),
  });

  const startEdit = (f: mastodon.v2.Filter) => {
    const kw = f.keywords[0];
    setForm({
      editingId: f.id,
      title: f.title,
      keyword: kw?.keyword ?? '',
      keywordId: kw?.id ?? null,
      wholeWord: kw?.wholeWord ?? true,
      contexts: f.context,
      action: f.filterAction,
      expiresIn: '',
    });
    setShowForm(true);
  };

  const startAdd = () => {
    setForm(blankForm);
    setShowForm(true);
  };

  const toggleContext = (ctx: mastodon.v2.FilterContext, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      contexts: checked ? [...prev.contexts, ctx] : prev.contexts.filter((c) => c !== ctx),
    }));
  };

  if (isLoading) return <InlineLoading description="Loading filters…" />;

  return (
    <div className={styles.panel}>
      {error && (
        <InlineNotification
          kind="error"
          title="Filter action failed"
          subtitle={error}
          lowContrast
          onCloseButtonClick={() => setError(null)}
        />
      )}

      {filters.length === 0 && !showForm && (
        <p className={styles.empty}>No keyword filters yet.</p>
      )}

      <ul className={styles.list}>
        {filters.map((f) => (
          <li key={f.id} className={styles.row}>
            <div className={styles.rowMain}>
              <span className={styles.rowTitle}>{f.title}</span>
              <span className={styles.rowMeta}>
                {f.filterAction} · {f.context.join(', ')}
                {f.keywords.length > 0 && ` · ${f.keywords.map((k) => k.keyword).join(', ')}`}
                {f.expiresAt && ` · expires ${new Date(f.expiresAt).toLocaleString()}`}
              </span>
            </div>
            <div className={styles.rowActions}>
              <Button kind="ghost" size="sm" onClick={() => startEdit(f)}>
                Edit
              </Button>
              <Button
                kind="danger--ghost"
                size="sm"
                hasIconOnly
                iconDescription="Delete filter"
                renderIcon={TrashCan}
                disabled={remove.isPending}
                onClick={() => setPendingDelete(f)}
              />
            </div>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <h3 className={styles.formHeading}>{form.editingId ? 'Edit filter' : 'New filter'}</h3>
          <TextInput
            id="filter-title"
            labelText="Filter name"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <TextInput
            id="filter-keyword"
            labelText="Keyword or phrase"
            value={form.keyword}
            onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))}
          />
          <Toggle
            id="filter-whole-word"
            size="sm"
            labelText="Match whole word only"
            toggled={form.wholeWord}
            onToggle={(checked) => setForm((p) => ({ ...p, wholeWord: checked }))}
          />
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Apply in</legend>
            {CONTEXTS.map((ctx) => (
              <Checkbox
                key={ctx}
                id={`filter-ctx-${ctx}`}
                labelText={ctx}
                checked={form.contexts.includes(ctx)}
                onChange={(_e, { checked }) => toggleContext(ctx, checked)}
              />
            ))}
          </fieldset>
          <Select
            id="filter-action"
            labelText="When matched"
            value={form.action}
            onChange={(e) =>
              setForm((p) => ({ ...p, action: e.target.value as mastodon.v2.FilterAction }))
            }
          >
            <SelectItem value="warn" text="Warn (hide behind a notice)" />
            <SelectItem value="hide" text="Hide completely" />
          </Select>
          <Select
            id="filter-expiry"
            labelText="Expires"
            value={form.expiresIn}
            onChange={(e) => setForm((p) => ({ ...p, expiresIn: e.target.value }))}
          >
            {EXPIRY_OPTIONS.map((o) => (
              <SelectItem key={o.label} value={o.value} text={o.label} />
            ))}
          </Select>
          <div className={styles.formActions}>
            <Button type="submit" size="sm" disabled={!form.title.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save filter'}
            </Button>
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setForm(blankForm);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button kind="tertiary" size="sm" renderIcon={Add} onClick={startAdd}>
          Add filter
        </Button>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        heading="Delete filter"
        primaryText="Delete"
        danger
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
        }}
        onClose={() => setPendingDelete(null)}
      >
        Delete the filter &ldquo;{pendingDelete?.title}&rdquo;? This cannot be undone.
      </ConfirmModal>
    </div>
  );
}
