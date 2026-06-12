import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { InlineNotification, Loading } from '@carbon/react';
import { CheckmarkFilled } from '@carbon/icons-react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { useAccountStatuses } from '../hooks/api';
import AccountActionMenu from '../components/AccountActionMenu';
import AvatarChip from '../components/AvatarChip';
import EmojiText from '../components/EmojiText';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import SanitizedHtml from '../components/SanitizedHtml';
import TagPill from '../components/TagPill';
import TopicRow from '../components/TopicRow';
import NotFound from './NotFound';
import { errorMessage } from '../utils/apiErrors';
import { hostOf, isWebfingerHandle, stripLeadingAt } from '../utils/handles';
import { displayNameOf } from '../utils/status';
import styles from './Profile.module.css';

export default function Profile() {
  const { acct: rawAcct } = useParams<{ acct: string }>();
  // Profile URLs are `/@handle`; the route captures the whole segment, so a
  // missing `@` means this single-segment path isn't a profile at all.
  const decoded = rawAcct ? decodeURIComponent(rawAcct) : '';
  const isProfilePath = decoded.startsWith('@');
  const acct = isProfilePath ? stripLeadingAt(decoded) : '';
  const { client, credentials } = useAuth();

  const { data: account, isLoading: loadingAccount, error: accountError } = useQuery<mastodon.v1.Account>({
    queryKey: ['account', acct],
    queryFn: async () => {
      try {
        return await requireClient(client).v1.accounts.lookup({ acct });
      } catch (err) {
        // `accounts.lookup` is local-only. For a federated handle the home
        // server may simply not know the account yet — fall through to a
        // resolving search, which triggers a WebFinger fetch.
        if (isWebfingerHandle(acct)) {
          const results = await requireClient(client).v2.search.list({
            q: stripLeadingAt(acct),
            type: 'accounts',
            resolve: true,
            limit: 1,
          });
          const found = results.accounts[0];
          if (found) return found;
        }
        throw err;
      }
    },
    enabled: !!client && !!acct,
  });

  const {
    items: statuses,
    isLoading: loadingStatuses,
    error: statusesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAccountStatuses(account?.id);

  const {
    data: pinned = [],
    isLoading: loadingPinned,
    error: pinnedError,
  } = useQuery<mastodon.v1.Status[]>({
    queryKey: ['accountPinned', account?.id],
    queryFn: async () =>
      await requireClient(client).v1.accounts.$select(account!.id).statuses.list({ pinned: true }),
    enabled: !!client && !!account?.id,
    staleTime: 5 * 60_000,
  });

  const {
    data: featuredTags = [],
    error: featuredTagsError,
  } = useQuery<mastodon.v1.FeaturedTag[]>({
    queryKey: ['accountFeaturedTags', account?.id],
    queryFn: async () => await requireClient(client).v1.accounts.$select(account!.id).featuredTags.list(),
    enabled: !!client && !!account?.id,
    staleTime: 5 * 60_000,
  });

  const {
    data: endorsements = [],
    isLoading: loadingEndorsements,
    error: endorsementsError,
  } = useQuery<mastodon.v1.Account[]>({
    queryKey: ['accountEndorsements', account?.id],
    queryFn: async () => await requireClient(client).v1.accounts.$select(account!.id).endorsements.list(),
    enabled: !!client && !!account?.id,
    staleTime: 5 * 60_000,
  });

  // A single-segment path without a leading `@` is not a profile URL.
  if (!isProfilePath) return <NotFound />;

  if (!credentials) {
    return (
      <div className={styles.page}>
        <PageHeading>Profile</PageHeading>
        <p className={styles.empty}>Sign in to view profiles.</p>
      </div>
    );
  }

  if (loadingAccount) return <Loading description="Loading profile" withOverlay={false} />;
  if (accountError) {
    return (
      <InlineNotification
        kind="error"
        title="Profile not found"
        subtitle={errorMessage(accountError)}
        lowContrast
        hideCloseButton
      />
    );
  }
  if (!account) return null;

  const server = hostOf(credentials.url);
  const isLocal = account.acct === account.username;
  const handle = isLocal ? `@${account.username}@${server}` : `@${account.acct}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AvatarChip account={account} size="lg" />
        <div className={styles.names}>
          <h1 className={styles.displayName}>
            <EmojiText text={displayNameOf(account)} emojis={account.emojis} />
          </h1>
          <span className={styles.handle}>{handle}</span>
          <div className={styles.badges}>
            {account.bot && <span className={styles.badge}>Bot</span>}
            {account.locked && <span className={styles.badge}>Requires follow approval</span>}
            {account.createdAt && (
              <span className={styles.joined}>
                Joined{' '}
                {new Date(account.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                })}
              </span>
            )}
          </div>
        </div>
        <div className={styles.actions}>
          <AccountActionMenu account={account} />
        </div>
        <div className={styles.stats}>
          <span>
            <strong>{account.statusesCount}</strong> Posts
          </span>
          <span>
            <strong>{account.followersCount}</strong> Followers
          </span>
          <span>
            <strong>{account.followingCount}</strong> Following
          </span>
        </div>
      </header>

      {account.note && (
        <SanitizedHtml className={styles.bio} html={account.note} emojis={account.emojis} />
      )}

      {account.fields.length > 0 && (
        <dl className={styles.fields}>
          {account.fields.map((field, i) => (
            <div
              key={`${field.name}-${i}`}
              className={`${styles.field} ${field.verifiedAt ? styles.fieldVerified : ''}`}
            >
              <dt className={styles.fieldName}>
                <EmojiText text={field.name} emojis={account.emojis} />
              </dt>
              <dd className={styles.fieldValue}>
                {field.verifiedAt && (
                  <CheckmarkFilled
                    size={16}
                    className={styles.verifiedMark}
                    aria-label="Verified"
                  />
                )}
                <SanitizedHtml
                  className={styles.fieldValueText}
                  html={field.value}
                  emojis={account.emojis}
                />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {featuredTagsError ? (
        <InlineNotification
          kind="error"
          title="Couldn't load featured tags"
          subtitle={errorMessage(featuredTagsError)}
          lowContrast
          hideCloseButton
        />
      ) : (
        featuredTags.length > 0 && (
          <div className={styles.featuredTags}>
            {featuredTags.map((tag) => (
              <TagPill key={tag.id} name={tag.name} />
            ))}
          </div>
        )
      )}

      {(loadingPinned || pinnedError || pinned.length > 0) && (
        <section className={styles.section} aria-label="Pinned posts">
          <h2 className={styles.sectionHeading}>Pinned</h2>
          {loadingPinned ? (
            <Loading description="Loading pinned posts" withOverlay={false} small />
          ) : pinnedError ? (
            <InlineNotification
              kind="error"
              title="Couldn't load pinned posts"
              subtitle={errorMessage(pinnedError)}
              lowContrast
              hideCloseButton
            />
          ) : (
            <div className={styles.list}>
              {pinned.map((post) => (
                <TopicRow key={post.id} post={post} headingLevel={3} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.section} aria-label="Recent topics">
        <h2 className={styles.sectionHeading}>Recent topics</h2>
        <PaginatedList
          items={statuses}
          isLoading={loadingStatuses}
          error={statusesError}
          errorTitle="Couldn't load recent topics"
          emptyMessage="No recent topics."
          emptyClassName={styles.empty}
          skeletonRows={4}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        >
          <div className={styles.list}>
            {statuses.map((post) => (
              <TopicRow key={post.id} post={post} headingLevel={3} />
            ))}
          </div>
        </PaginatedList>
      </section>

      {(loadingEndorsements || endorsementsError || endorsements.length > 0) && (
        <section className={styles.section} aria-label="Featured profiles">
          <h2 className={styles.sectionHeading}>Featured profiles</h2>
          {loadingEndorsements ? (
            <Loading description="Loading featured profiles" withOverlay={false} small />
          ) : endorsementsError ? (
            <InlineNotification
              kind="error"
              title="Couldn't load featured profiles"
              subtitle={errorMessage(endorsementsError)}
              lowContrast
              hideCloseButton
            />
          ) : (
            <div className={styles.endorsements}>
              {endorsements.map((e) => (
                <Link
                  key={e.id}
                  to={`/@${encodeURIComponent(e.acct)}`}
                  className={styles.endorsement}
                >
                  <AvatarChip account={e} size="sm" />
                  <span className={styles.endorsementName}>
                    <EmojiText text={displayNameOf(e)} emojis={e.emojis} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
