// The header search is a combobox: role="combobox" on the input drives a
// listbox of tag suggestions, wrapped in a role="search" landmark.
import { useActionState, useId, useMemo, useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Form,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Search,
  TextInput,
} from '@carbon/react';
import EmojiText from './EmojiText';
import { Email, EmailNew, Menu, Notification, NotificationNew, Settings, UserAvatar } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext';
import { initiateMastodonLogin } from '../utils/auth';
import { errorMessage } from '../utils/apiErrors';
import { APP_CONFIG } from '../config';
import { buildSearchPath, defaultTypeForQuery, tagQueryFromInput } from '../utils/search';
import { hostOf } from '../utils/handles';
import { useCurrentUser } from '../utils/queries';
import {
  useFollowRequestCount,
  useNotificationCount,
  useTagSearch,
  useUnreadConversationCount,
} from '../hooks/api';
import { useDebounce } from '../hooks/useDebounce';
import SettingsModal from './SettingsModal';
import SuggestPopover from './SuggestPopover';
import TagPicker, { type TagSuggestion } from './TagPicker';
import styles from './Header.module.css';

interface Props {
  onMenuToggle?: () => void;
  menuExpanded?: boolean;
}

export default function Header({ onMenuToggle, menuExpanded = false }: Props) {
  const { credentials, accounts, logout, switchAccount } = useAuth();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [suggestSelected, setSuggestSelected] = useState(0);
  const [suggestDismissed, setSuggestDismissed] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [newInstance, setNewInstance] = useState('');

  const otherAccounts = accounts.filter((a) => a.url !== credentials?.url);

  // React 19 form action: pending + error state come from useActionState instead
  // of hand-tracked `adding`/`addError` flags. On success the browser redirects
  // to the instance, so the resolved value is just the next error string ('').
  const [addError, submitAddAccount, adding] = useActionState<string, string>(
    async (_prev, instance) => {
      try {
        await initiateMastodonLogin(instance);
        return '';
      } catch (err) {
        return errorMessage(err, 'Failed to connect to instance');
      }
    },
    '',
  );

  const { data: currentUser } = useCurrentUser();
  const { data: unread } = useNotificationCount();
  const { data: unreadMessages } = useUnreadConversationCount();
  const { data: followRequestCount = 0 } = useFollowRequestCount();

  // Live hashtag suggestions while the user types a single `#tag` token. The
  // debounced query feeds a cached query hook — no hand-rolled timer/fetch here.
  const tagQuery = tagQueryFromInput(searchValue) ?? '';
  const debouncedTagQuery = useDebounce(tagQuery, 200);
  const { data: hashtags } = useTagSearch(debouncedTagQuery);
  const tagSuggestions = useMemo<TagSuggestion[]>(
    () => (hashtags ?? []).map((h) => ({ name: h.name, following: false })),
    [hashtags],
  );

  // Reset the highlighted option whenever the suggestion query changes.
  const [seenQuery, setSeenQuery] = useState(debouncedTagQuery);
  if (seenQuery !== debouncedTagQuery) {
    setSeenQuery(debouncedTagQuery);
    setSuggestSelected(0);
  }

  const showSuggestions = !suggestDismissed && !!tagQuery && tagSuggestions.length > 0;

  // ARIA combobox wiring for the tag-suggestion dropdown.
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-opt-${index}`;
  const activeOptionId = showSuggestions ? optionId(suggestSelected) : undefined;

  // Stable icon identity for Carbon's `renderIcon`: returning a fresh function on
  // every render would remount the avatar node, destroying focus and thrashing
  // layout. Memoised so it only changes when the avatar URL or the dot does.
  const hasRequests = followRequestCount > 0;
  const accountIcon = useMemo<ComponentType>(
    () => (currentUser?.avatar ? makeAvatarIcon(currentUser.avatar, hasRequests) : UserAvatar),
    [currentUser, hasRequests],
  );

  const goToTag = (name: string) => {
    setSearchValue('');
    setSuggestDismissed(true);
    navigate(`/board/${encodeURIComponent(name)}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Enter while a tag suggestion is highlighted jumps straight to that board.
    if (showSuggestions && tagSuggestions[suggestSelected]) {
      goToTag(tagSuggestions[suggestSelected].name);
      return;
    }
    const value = searchValue.trim();
    if (!value) return;
    setSearchValue('');
    setSuggestDismissed(true);
    if (value.startsWith('@')) {
      navigate(`/@${encodeURIComponent(value.slice(1))}`);
    } else if (value.startsWith('#')) {
      navigate(`/board/${encodeURIComponent(value.slice(1))}`);
    } else {
      navigate(buildSearchPath(value, defaultTypeForQuery(value)));
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestSelected((s) => (s + 1) % tagSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestSelected((s) => (s - 1 + tagSuggestions.length) % tagSuggestions.length);
    } else if (e.key === 'Escape') {
      setSuggestDismissed(true);
    }
  };

  return (
    <>
      <header className={styles.header} >
        <div className={styles.leadGroup}>
          {credentials && (
            <button
              type="button"
              className={styles.menuButton}
              onClick={onMenuToggle}
              aria-expanded={menuExpanded}
              aria-controls="primary-nav"
              aria-label={menuExpanded ? 'Close navigation' : 'Open navigation'}
            >
              <Menu size={20} />
            </button>
          )}
          {/* The persistent brand is site chrome, not a page heading — each
              routed page owns the single <h1>. Kept as a styled link with an
              explicit label rather than a heading element. */}
          <Link to="/" className={styles.brand} aria-label={`${APP_CONFIG.appName} home`}>
            {APP_CONFIG.appName}
          </Link>
        </div>

        {credentials ? (
          <search className={styles.search}>
            <form onSubmit={submitSearch}>
              {/* Carbon's <Search> renders the focusable <input>. */}
              {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus */}
              <Search
                id="header-search"
                labelText="Search people, posts and tags"
                placeholder="Search people, posts, #tags…"
                size="md"
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setSuggestDismissed(false);
                }}
                onClear={() => {
                  setSearchValue('');
                  setSuggestDismissed(true);
                }}
                onKeyDown={onSearchKeyDown}
                onBlur={() => setSuggestDismissed(true)}
                autoComplete="off"
                // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
                role="combobox"
                aria-expanded={showSuggestions}
                aria-controls={showSuggestions ? listboxId : undefined}
                aria-activedescendant={activeOptionId}
                aria-autocomplete="list"
              />
              {showSuggestions && (
                <SuggestPopover anchored>
                  <TagPicker
                    tags={tagSuggestions}
                    selected={suggestSelected}
                    onPick={(i) => goToTag(tagSuggestions[i].name)}
                    listboxId={listboxId}
                    optionId={optionId}
                  />
                </SuggestPopover>
              )}
            </form>
          </search>
        ) : (
          <span />
        )}

        <div className={styles.right}>
          {credentials && (
            <Link
              to="/messages"
              className={styles.notifyButton}
              aria-label={
                unreadMessages && unreadMessages > 0
                  ? `Messages — ${unreadMessages} unread`
                  : 'Messages'
              }
            >
              {unreadMessages && unreadMessages > 0 ? <EmailNew size={20} /> : <Email size={20} />}
              {unreadMessages && unreadMessages > 0 ? (
                <span className={styles.badge} aria-hidden="true">
                  {unreadMessages > 99 ? '99+' : unreadMessages}
                </span>
              ) : null}
            </Link>
          )}
          {credentials && (
            <Link
              to="/notifications"
              className={styles.notifyButton}
              aria-label={
                unread && unread > 0
                  ? `Notifications — ${unread} unread`
                  : 'Notifications'
              }
            >
              {unread && unread > 0 ? <NotificationNew size={20} /> : <Notification size={20} />}
              {unread && unread > 0 ? (
                <span className={styles.badge} aria-hidden="true">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </Link>
          )}

          {credentials && currentUser && (
            <div className={styles.identity}>
              <div className={styles.displayName}>
                <EmojiText
                  text={currentUser.displayName || currentUser.username}
                  emojis={currentUser.emojis}
                />
              </div>
              <div className={styles.acct}>
                @{currentUser.username}@{hostOf(credentials.url)}
              </div>
            </div>
          )}
          {credentials && (
            <OverflowMenu
              size="md"
              menuOptionsClass={styles.accountMenu}
              renderIcon={accountIcon}
              iconDescription={
                hasRequests
                  ? `Account menu — ${followRequestCount} follow requests`
                  : 'Account menu'
              }
              flipped
            >
              <OverflowMenuItem
                itemText="My profile"
                onClick={() => navigate(`/@${encodeURIComponent(currentUser?.acct ?? '')}`)}
                disabled={!currentUser}
              />
              <OverflowMenuItem
                itemText={
                  hasRequests
                    ? `Follow requests (${followRequestCount})`
                    : 'Follow requests'
                }
                onClick={() => navigate('/follow-requests')}
              />
              <OverflowMenuItem
                itemText="Scheduled posts"
                onClick={() => navigate('/scheduled')}
              />
              <OverflowMenuItem
                itemText="Settings"
                onClick={() => setIsSettingsOpen(true)}
              />
              {otherAccounts.map((account, i) => (
                <OverflowMenuItem
                  key={account.url}
                  hasDivider={i === 0}
                  itemText={`Switch to ${hostOf(account.url)}`}
                  onClick={() => {
                    switchAccount(account.url);
                    navigate('/');
                  }}
                />
              ))}
              <OverflowMenuItem
                hasDivider={otherAccounts.length === 0}
                itemText="Add account"
                onClick={() => {
                  setNewInstance('');
                  setAddAccountOpen(true);
                }}
              />
              <OverflowMenuItem
                itemText="Log out"
                hasDivider
                isDelete
                onClick={() => {
                  void logout().then(() => navigate('/'));
                }}
              />
            </OverflowMenu>
          )}
          {!credentials && (
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
          )}
        </div>
      </header>
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <Modal
        open={addAccountOpen}
        onRequestClose={() => setAddAccountOpen(false)}
        modalHeading="Add another account"
        primaryButtonText={adding ? 'Connecting…' : 'Continue'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={!newInstance.trim() || adding}
        onRequestSubmit={() => submitAddAccount(newInstance)}
        onSecondarySubmit={() => setAddAccountOpen(false)}
      >
        <Form action={() => submitAddAccount(newInstance)}>
          <p className={styles.addHint}>
            You'll be redirected to authorise the new instance, then returned here. Your
            current account stays signed in.
          </p>
          <TextInput
            id="add-account-instance"
            name="instance"
            labelText="Instance URL"
            placeholder="mastodon.social"
            value={newInstance}
            onChange={(e) => setNewInstance(e.target.value)}
          />
          {addError && (
            <InlineNotification
              kind="error"
              title="Couldn't connect"
              subtitle={addError}
              lowContrast
              hideCloseButton
            />
          )}
        </Form>
      </Modal>
    </>
  );
}

/**
 * Build a stable avatar icon component for Carbon's `renderIcon`. Defined at
 * module scope (not inside render) so each call returns a component whose
 * identity the caller can memoise.
 */
function makeAvatarIcon(src: string, hasDot: boolean): ComponentType {
  return function RenderAvatar() {
    return (
      <span className={styles.avatarWrap}>
        <img src={src} alt="" className={styles.avatar} />
        {hasDot && <span className={styles.dot} aria-hidden="true" />}
      </span>
    );
  };
}
