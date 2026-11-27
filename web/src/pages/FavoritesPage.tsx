import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AppShell } from '../components/AppShell';
import { ErrorBanner } from '../components/ErrorBanner';
import { Icon } from '../components/Icon';
import { TransactionHistoryRow } from '../components/TransactionHistoryRow';
import { useAuth } from '../context/AuthContext';
import { favoritesQueryKey, fetchTransactions } from '../api/transactions.api';
import { errorCode, errorMessage } from '../api/http';
import { colors, font, radius, space } from '../styles/theme';

const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

const cardStyle: React.CSSProperties = {
  borderRadius: radius.xl,
  padding: `${space[2]} ${space[5]}`,
};

const skeletonBar: React.CSSProperties = {
  display: 'block',
  height: '0.85rem',
  borderRadius: radius.full,
  backgroundColor: '#E8E2D6',
};

const pagerButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: space[1],
  padding: '0.35rem 0.8rem',
  borderRadius: radius.md,
  border: `1px solid ${colors.parchment}`,
  backgroundColor: colors.surfaceSolid,
  color: colors.cobalt,
  fontWeight: font.weight.medium,
  cursor: 'pointer',
};

const FavoritesSkeleton: React.FC = () => (
  <ul data-testid="favorites-skeleton" role="status" aria-label="Loading favorites" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
    {[0, 1, 2].map((index) => (
      <li
        key={index}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: space[2],
          padding: `${space[3]} 0`,
          borderTop: index === 0 ? 'none' : `1px solid ${colors.border}`,
        }}
      >
        <span style={{ ...skeletonBar, width: '30%' }} />
        <span style={{ ...skeletonBar, width: '55%', height: '1rem' }} />
      </li>
    ))}
  </ul>
);

/** FR-19 / f-15 §2.2: `/favorites` lists the caller's favorite transactions, newest first. */
export const FavoritesPage: React.FC = () => {
  const { refetchUser } = useAuth();
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const favoritesQuery = useQuery({
    queryKey: [...favoritesQueryKey, { limit, offset }],
    queryFn: () => fetchTransactions(limit, offset, { favorite: true }),
    placeholderData: keepPreviousData,
  });

  const unauthenticated = errorCode(favoritesQuery.error) === 'UNAUTHENTICATED';
  useEffect(() => {
    if (unauthenticated) void refetchUser();
  }, [unauthenticated, refetchUser]);

  const page = favoritesQuery.data;
  const showSkeleton = favoritesQuery.isPending || (favoritesQuery.isError && favoritesQuery.isFetching);
  const firstShown = page && page.items.length > 0 ? page.offset + 1 : 0;
  const lastShown = page ? page.offset + page.items.length : 0;

  return (
    <AppShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: space[3], flexWrap: 'wrap', marginBottom: space[6] }}>
          <div>
            <h2 style={{ fontSize: font.size['2xl'], fontWeight: font.weight.semibold, color: colors.textPrimary, marginBottom: space[2] }}>
              Favorites
            </h2>
            <p style={{ color: colors.textMuted, margin: 0 }}>Transactions saved for quick duplication.</p>
          </div>
          <Link to="/transactions" className="pt-btn-primary">
            View all history
          </Link>
        </div>

        {notice && (
          <div role="status" data-testid="favorites-notice" className="pt-error-banner">
            {notice}
          </div>
        )}

        {favoritesQuery.isError && !favoritesQuery.isFetching && (
          <ErrorBanner
            message={errorMessage(favoritesQuery.error, 'Unable to load your favorites. Please try again.')}
            onRetry={() => void favoritesQuery.refetch()}
          />
        )}

        <section aria-label="Favorite transactions" className="pt-card" style={cardStyle}>
          {showSkeleton ? (
            <FavoritesSkeleton />
          ) : favoritesQuery.isError ? null : page && page.total === 0 ? (
            <div data-testid="favorites-empty" style={{ padding: `${space[6]} 0`, textAlign: 'center' }}>
              <p style={{ fontSize: font.size.base, color: colors.textSecondary, margin: `0 0 ${space[3]}` }}>
                No favorites yet. Use the star on a transaction to add one.
              </p>
              <Link to="/transactions" style={{ color: colors.cobalt, fontWeight: font.weight.semibold }}>
                Go to Transactions
              </Link>
            </div>
          ) : page ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {page.items.map((transaction, index) => (
                <TransactionHistoryRow
                  key={transaction.id}
                  transaction={transaction}
                  first={index === 0}
                  showFavoriteLabel
                  onNotice={setNotice}
                />
              ))}
            </ul>
          ) : null}
        </section>

        {page && page.total > 0 && !favoritesQuery.isError && (
          <nav
            aria-label="Favorites pages"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space[3], flexWrap: 'wrap', marginTop: space[4] }}
          >
            <span data-testid="history-counter" style={{ fontSize: font.size.sm, color: colors.textSecondary }}>
              Showing {firstShown}–{lastShown} of {page.total}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
              <label style={{ fontSize: font.size.sm, color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: space[1] }}>
                Per page
                <select
                  data-testid="history-page-size"
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setOffset(0);
                  }}
                  style={{ padding: '0.25rem', borderRadius: radius.sm, border: `1px solid ${colors.parchment}` }}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                data-testid="history-prev"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                style={{ ...pagerButton, opacity: offset === 0 ? 0.5 : 1 }}
              >
                <Icon name="chevron_left" size={1.125} />
                Previous
              </button>
              <button
                type="button"
                data-testid="history-next"
                disabled={lastShown >= page.total}
                onClick={() => setOffset(offset + limit)}
                style={{ ...pagerButton, opacity: lastShown >= page.total ? 0.5 : 1 }}
              >
                Next
                <Icon name="chevron_right" size={1.125} />
              </button>
            </div>
          </nav>
        )}
      </div>
    </AppShell>
  );
};
