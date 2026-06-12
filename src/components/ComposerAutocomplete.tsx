import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor, KeyMap } from 'codemirror';
import { useQueryClient } from '@tanstack/react-query';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { tokenAtCursor, type HintType } from '../utils/composerHints';
import MentionPicker from './MentionPicker';
import TagPicker, { type TagSuggestion } from './TagPicker';
import SuggestPopover from './SuggestPopover';

interface Props {
  /** The CodeMirror 5 instance behind the EasyMDE editor, once available. */
  cm: Editor | null;
}

interface ActiveToken {
  type: HintType;
  query: string;
  start: number;
  end: number;
  line: number;
}

/** Composer `@`/`#` autocomplete; token detection lives in `composerHints.ts`, this owns the CodeMirror wiring. */
export default function ComposerAutocomplete({ cm }: Props) {
  const { client } = useAuth();
  const queryClient = useQueryClient();

  const [token, setToken] = useState<ActiveToken | null>(null);
  const [accounts, setAccounts] = useState<mastodon.v1.Account[]>([]);
  const [tags, setTags] = useState<TagSuggestion[]>([]);
  const [selected, setSelected] = useState(0);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  const count = token?.type === 'mention' ? accounts.length : tags.length;
  const open = !!token && !!coords && count > 0;

  // Refs let the (stable) CodeMirror keymap handlers read current state.
  const tokenRef = useRef(token);
  const accountsRef = useRef(accounts);
  const tagsRef = useRef(tags);
  const selectedRef = useRef(selected);
  useEffect(() => {
    tokenRef.current = token;
    accountsRef.current = accounts;
    tagsRef.current = tags;
    selectedRef.current = selected;
  });

  const close = useCallback(() => {
    setToken(null);
    setAccounts([]);
    setTags([]);
    setSelected(0);
    setCoords(null);
  }, []);

  const accept = useCallback(
    (index: number) => {
      const tok = tokenRef.current;
      if (!tok || !cm) return;
      const insert =
        tok.type === 'mention'
          ? accountsRef.current[index] && `@${accountsRef.current[index].acct} `
          : tagsRef.current[index] && `#${tagsRef.current[index].name} `;
      if (!insert) return;
      cm.replaceRange(insert, { line: tok.line, ch: tok.start }, { line: tok.line, ch: tok.end });
      cm.focus();
      close();
    },
    [cm, close],
  );

  // Detect the token under the cursor on every cursor move / keystroke.
  useEffect(() => {
    if (!cm) return;
    const onCursor = () => {
      const cur = cm.getCursor();
      const line = cm.getLine(cur.line) ?? '';
      const tok = tokenAtCursor(line, cur.ch);
      if (!tok || tok.query.length < 1) {
        close();
        return;
      }
      setToken({ ...tok, line: cur.line });
      const c = cm.cursorCoords(true, 'window');
      setCoords({ left: c.left, top: c.bottom });
    };
    cm.on('cursorActivity', onCursor);
    cm.on('blur', close);
    return () => {
      cm.off('cursorActivity', onCursor);
      cm.off('blur', close);
    };
  }, [cm, close]);

  // Debounced search for the active token.
  useEffect(() => {
    if (!client || !token || token.query.length < 1) return;
    const handle = setTimeout(() => {
      const type = token.type === 'mention' ? 'accounts' : 'hashtags';
      void (async () => {
        try {
          const res = await client.v2.search.list({
            q: token.query,
            type,
            limit: 6,
            resolve: false,
          });
          if (token.type === 'mention') {
            setAccounts(res.accounts);
            setTags([]);
          } else {
            const followed = new Set(
              (queryClient.getQueryData<mastodon.v1.Tag[]>(['followedTags']) ?? []).map(
                (t) => t.name.toLowerCase(),
              ),
            );
            setTags(
              res.hashtags.map((h) => ({
                name: h.name,
                following: followed.has(h.name.toLowerCase()),
              })),
            );
            setAccounts([]);
          }
          setSelected(0);
        } catch {
          setAccounts([]);
          setTags([]);
        }
      })();
    }, 200);
    return () => clearTimeout(handle);
  }, [client, queryClient, token]);

  // Bind editor navigation keys only while the popover is open.
  useEffect(() => {
    if (!cm || !open) return;
    const keymap: KeyMap = {
      Up: () => setSelected((s) => (s - 1 + count) % count),
      Down: () => setSelected((s) => (s + 1) % count),
      Enter: () => accept(selectedRef.current),
      Tab: () => accept(selectedRef.current),
      Esc: () => close(),
    };
    cm.addKeyMap(keymap);
    return () => cm.removeKeyMap(keymap);
  }, [cm, open, count, accept, close]);

  if (!open || !coords) return null;

  return (
    <SuggestPopover style={{ left: coords.left, top: coords.top }}>
      {token?.type === 'mention' ? (
        <MentionPicker accounts={accounts} selected={selected} onPick={accept} />
      ) : (
        <TagPicker tags={tags} selected={selected} onPick={accept} />
      )}
    </SuggestPopover>
  );
}
