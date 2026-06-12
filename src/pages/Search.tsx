import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@carbon/react';
import type { mastodon } from 'masto';
import { useAuth } from '../context/AuthContext';
import { requireClient } from '../utils/client';
import { useOffsetList } from '../hooks/api';
import AvatarChip from '../components/AvatarChip';
import EmojiText from '../components/EmojiText';
import AccountActionMenu from '../components/AccountActionMenu';
import PageHeading from '../components/PageHeading';
import PaginatedList from '../components/PaginatedList';
import TagPill from '../components/TagPill';
import TopicRow from '../components/TopicRow';
import { stripHtml, truncate } from '../utils/sanitize';
import { displayNameOf, ACCOUNT_BIO_PREVIEW_CHARS } from '../utils/status';
import { normalizeSearchType, type SearchType } from '../utils/search';
import styles from './Search.module.css';

type SearchResult = mastodon.v1.Account | mastodon.v1.Tag | mastodon.v1.Status;

const PAGE_SIZE = 20;
const TAB_ORDER: SearchType[] = ['accounts', 'hashtags', 'statuses'];
const TAB_LABELS: Record<SearchType, string> = {
  accounts: 'People',
  hashtags: 'Tags',
  statuses: 'Posts',
};

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { client, credentials } = useAuth();

  const q = (params.get('q') ?? '').trim();
  const type = normalizeSearchType(params.get('type'));

  const {
    items: results,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOffsetList<SearchResult>({
    queryKey: ['search', q, type],
    fetchPage: async ({ limit, offset }) => {
      const res = await requireClient(client).v2.search.list({
        q,
        type,
        limit,
        offset,
        resolve: type === 'accounts',
      });
      if (type === 'accounts') return res.accounts;
      if (type === 'hashtags') return res.hashtags;
      return res.statuses;
    },
    pageSize: PAGE_SIZE,
    enabled: !!client && q.length > 0,
  });

  const selectTab = (index: number) => {
    setParams({ q, type: TAB_ORDER[index] });
  };

  if (!credentials) {
    return (
      <div className={styles.page} style={{ textAlign: 'center' }}>
        <PageHeading className={styles.title}>Search</PageHeading>
        <p className={styles.empty}>Sign in to search people, posts and tags.</p>
        <Button onClick={() => navigate('/')}>Go to sign-in</Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Search'}
      </h1>

      {!q && (
        <p className={styles.empty}>Type a query in the search box above to begin.</p>
      )}

      {q && (
        <Tabs selectedIndex={TAB_ORDER.indexOf(type)} onChange={({ selectedIndex }) => selectTab(selectedIndex)}>
          <TabList aria-label="Search result types">
            {TAB_ORDER.map((t) => (
              <Tab key={t}>{TAB_LABELS[t]}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {TAB_ORDER.map((t) => (
              <TabPanel key={t} className={styles.panel}>
                {t === type && (
                  <PaginatedList
                    items={results}
                    isLoading={isLoading}
                    error={error}
                    errorTitle="Search failed"
                    emptyMessage={`No ${TAB_LABELS[t].toLowerCase()} found.`}
                    emptyClassName={styles.empty}
                    skeletonRows={5}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                  >
                    {type === 'accounts' && (
                      <div className={styles.list}>
                        {(results as mastodon.v1.Account[]).map((account) => (
                          <AccountResultRow key={account.id} account={account} />
                        ))}
                      </div>
                    )}

                    {type === 'hashtags' && (
                      <div className={styles.tagList}>
                        {(results as mastodon.v1.Tag[]).map((tag) => (
                          <TagPill key={tag.name} name={tag.name} />
                        ))}
                      </div>
                    )}

                    {type === 'statuses' && (
                      <div className={styles.list}>
                        {(results as mastodon.v1.Status[]).map((post) => (
                          <TopicRow key={post.id} post={post} headingLevel={2} />
                        ))}
                      </div>
                    )}
                  </PaginatedList>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      )}
    </div>
  );
}

function AccountResultRow({ account }: { account: mastodon.v1.Account }) {
  const name = displayNameOf(account);
  const bio = truncate(stripHtml(account.note ?? ''), ACCOUNT_BIO_PREVIEW_CHARS);
  return (
    <div className={styles.accountRow}>
      <Link to={`/@${encodeURIComponent(account.acct)}`} className={styles.accountLink}>
        <AvatarChip account={account} size="lg" />
        <span className={styles.accountText}>
          <span className={styles.accountName}>
            <EmojiText text={name} emojis={account.emojis} />
          </span>
          <span className={styles.accountAcct}>@{account.acct}</span>
          {bio && <span className={styles.accountBio}>{bio}</span>}
        </span>
      </Link>
      <AccountActionMenu account={{ id: account.id, acct: account.acct }} size="sm" />
    </div>
  );
}
