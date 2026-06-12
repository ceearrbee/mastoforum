import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Button,
  InlineNotification,
  Modal,
  TextInput,
} from '@carbon/react';
import { Add, Edit, TrashCan } from '@carbon/icons-react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import AvatarChip from './AvatarChip';
import ConfirmModal from './ConfirmModal';
import EmojiText from './EmojiText';
import { errorMessage } from '../utils/apiErrors';
import { displayNameOf } from '../utils/status';
import styles from './ListsManagerModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ListsManagerModal({ open, onClose }: Props) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: lists = [] } = useQuery<mastodon.v1.List[]>({
    queryKey: ['lists'],
    queryFn: async () => await requireClient(client).v1.lists.list(),
    enabled: !!client && open,
  });

  const invalidateLists = () => queryClient.invalidateQueries({ queryKey: ['lists'] });
  const fail = (err: unknown) => setError(errorMessage(err));

  const createList = useMutation({
    mutationFn: (title: string) => requireClient(client).v1.lists.create({ title }),
    onSuccess: () => {
      setNewTitle('');
      invalidateLists();
    },
    onError: fail,
  });

  // Portal to <body>: this modal is opened from inside the left rail, which is
  // a `transform`/`overflow` container — without a portal, Carbon's modal
  // (which renders inline) gets trapped and clipped inside the rail.
  return createPortal(
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Manage lists"
      primaryButtonText="Done"
      onRequestSubmit={onClose}
      size="md"
    >
      <div className={styles.body}>
        {error && (
          <InlineNotification
            kind="error"
            title="List action failed"
            subtitle={error}
            lowContrast
            onCloseButtonClick={() => setError(null)}
          />
        )}

        <form
          className={styles.createRow}
          onSubmit={(e) => {
            e.preventDefault();
            const title = newTitle.trim();
            if (title) createList.mutate(title);
          }}
        >
          <TextInput
            id="new-list-title"
            labelText="New list name"
            placeholder="e.g. Close friends"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Button
            type="submit"
            kind="primary"
            size="md"
            renderIcon={Add}
            disabled={!newTitle.trim() || createList.isPending}
          >
            Create
          </Button>
        </form>

        {lists.length === 0 ? (
          <p className={styles.empty}>You don't have any lists yet.</p>
        ) : (
          <ul className={styles.lists}>
            {lists.map((list) => (
              <ListRow key={list.id} list={list} onError={fail} onChanged={invalidateLists} />
            ))}
          </ul>
        )}
      </div>
    </Modal>,
    document.body,
  );
}

function ListRow({
  list,
  onError,
  onChanged,
}: {
  list: mastodon.v1.List;
  onError: (err: unknown) => void;
  onChanged: () => void;
}) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [membersOpen, setMembersOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rename = useMutation({
    mutationFn: (next: string) => requireClient(client).v1.lists.$select(list.id).update({ title: next }),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: () => requireClient(client).v1.lists.$select(list.id).remove(),
    onSuccess: onChanged,
    onError,
  });

  const membersKey = ['listMembers', list.id];
  const { data: members = [] } = useQuery<mastodon.v1.Account[]>({
    queryKey: membersKey,
    queryFn: async () => await requireClient(client).v1.lists.$select(list.id).accounts.list(),
    enabled: !!client && membersOpen,
  });

  const removeMember = useMutation({
    mutationFn: (accountId: string) =>
      requireClient(client).v1.lists.$select(list.id).accounts.remove({ accountIds: [accountId] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey }),
    onError,
  });

  return (
    <li className={styles.listRow}>
      <div className={styles.listHead}>
        {editing ? (
          <form
            className={styles.renameForm}
            onSubmit={(e) => {
              e.preventDefault();
              const next = title.trim();
              if (next) rename.mutate(next);
            }}
          >
            <TextInput
              id={`rename-${list.id}`}
              labelText={`Rename ${list.title}`}
              hideLabel
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Button type="submit" size="sm" kind="primary" disabled={rename.isPending}>
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              kind="ghost"
              onClick={() => {
                setTitle(list.title);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <button
              type="button"
              className={styles.membersToggle}
              aria-expanded={membersOpen}
              onClick={() => setMembersOpen((v) => !v)}
            >
              {list.title}
            </button>
            <div className={styles.listActions}>
              <Button
                hasIconOnly
                size="sm"
                kind="ghost"
                renderIcon={Edit}
                iconDescription="Rename list"
                onClick={() => setEditing(true)}
              />
              <Button
                hasIconOnly
                size="sm"
                kind="danger--ghost"
                renderIcon={TrashCan}
                iconDescription="Delete list"
                disabled={remove.isPending}
                onClick={() => setConfirmDelete(true)}
              />
            </div>
          </>
        )}
      </div>

      {membersOpen && (
        <div className={styles.members}>
          <AddMemberSearch listId={list.id} membersKey={membersKey} onError={onError} />
          {members.length === 0 ? (
            <p className={styles.empty}>No members yet. Search above to add people you follow.</p>
          ) : (
            <ul className={styles.memberList}>
              {members.map((m) => (
                <li key={m.id} className={styles.memberRow}>
                  <span className={styles.member}>
                    <AvatarChip account={m} size="sm" />
                    <EmojiText text={displayNameOf(m)} emojis={m.emojis} />
                  </span>
                  <Button
                    size="sm"
                    kind="ghost"
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(m.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmDelete}
        heading="Delete list"
        primaryText="Delete"
        danger
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmDelete(false)}
      >
        Delete the list &ldquo;{list.title}&rdquo;? This cannot be undone.
      </ConfirmModal>
    </li>
  );
}

function AddMemberSearch({
  listId,
  membersKey,
  onError,
}: {
  listId: string;
  membersKey: string[];
  onError: (err: unknown) => void;
}) {
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<mastodon.v1.Account[]>([]);

  const search = useMutation({
    mutationFn: async (q: string) =>
      await requireClient(client).v2.search.list({ q, type: 'accounts', limit: 5, resolve: false }),
    onSuccess: (res) => setResults(res.accounts),
    onError,
  });

  const add = useMutation({
    mutationFn: (accountId: string) =>
      requireClient(client).v1.lists.$select(listId).accounts.create({ accountIds: [accountId] }),
    onSuccess: () => {
      setQuery('');
      setResults([]);
      queryClient.invalidateQueries({ queryKey: membersKey });
    },
    onError,
  });

  return (
    <div className={styles.addMember}>
      <form
        className={styles.searchRow}
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (q) search.mutate(q);
        }}
      >
        <TextInput
          id={`add-member-${listId}`}
          labelText="Add a member"
          hideLabel
          placeholder="Search people you follow…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" size="sm" kind="secondary" disabled={!query.trim() || search.isPending}>
          Search
        </Button>
      </form>
      {results.length > 0 && (
        <ul className={styles.searchResults}>
          {results.map((acc) => (
            <li key={acc.id} className={styles.memberRow}>
              <span className={styles.member}>
                <AvatarChip account={acc} size="sm" />
                <span className={styles.resultHandle}>@{acc.acct}</span>
              </span>
              <Button size="sm" kind="primary" disabled={add.isPending} onClick={() => add.mutate(acc.id)}>
                Add
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
