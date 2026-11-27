import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FavoriteButton } from './FavoriteButton';
import { Icon } from './Icon';
import { TransactionKindBadge, VoidedBadge } from './TransactionKindBadge';
import { HistoryTransaction } from '../types/transaction.types';
import { formatSatang } from '../utils/money';
import { formatCalendarDate } from '../utils/date';
import { colors, font, radius, space } from '../styles/theme';

const linkButton: React.CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'none',
  color: colors.cobalt,
  fontSize: font.size.xs,
  fontWeight: font.weight.medium,
  textDecoration: 'underline',
  cursor: 'pointer',
};

interface TransactionHistoryRowProps {
  transaction: HistoryTransaction;
  first: boolean;
  showFavoriteLabel?: boolean;
  onNotice?: (message: string) => void;
}

/** Shared transaction list row used by History (`/transactions`) and Favorites (`/favorites`). */
export const TransactionHistoryRow: React.FC<TransactionHistoryRowProps> = ({
  transaction,
  first,
  showFavoriteLabel = false,
  onNotice,
}) => {
  const [expanded, setExpanded] = useState(false);
  const linesId = `history-lines-${transaction.id}`;
  const lineCount = transaction.lines.length;
  // f-13 §2.2: a voided row keeps its place, marked and with its amounts struck through.
  const voided = transaction.voidedAt !== null;
  const struck: React.CSSProperties = voided ? { textDecoration: 'line-through', color: colors.textMuted } : {};

  return (
    <li
      data-testid="history-row"
      style={{ padding: `${space[3]} 0`, borderTop: first ? 'none' : `1px solid ${colors.border}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[3], flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
            <span style={{ fontSize: font.size.sm, color: colors.textMuted, whiteSpace: 'nowrap' }}>
              {formatCalendarDate(transaction.txnDate)}
            </span>
            <TransactionKindBadge kind={transaction.kind} />
            {voided && <VoidedBadge testId="history-voided" />}
          </div>
          <Link
            to={`/transactions/${transaction.id}`}
            data-testid="history-open"
            style={{
              display: 'block',
              marginTop: space[1],
              fontSize: font.size.base,
              fontWeight: font.weight.medium,
              color: colors.textPrimary,
              textDecoration: 'none',
              overflowWrap: 'anywhere',
            }}
          >
            {transaction.accountName}
          </Link>
          {transaction.memo && (
            <span style={{ display: 'block', fontSize: font.size.sm, color: colors.textSecondary, overflowWrap: 'anywhere' }}>
              {transaction.memo}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: space[1] }}>
          <span
            data-testid="history-total"
            style={{ fontSize: font.size.base, fontWeight: font.weight.bold, color: colors.textPrimary, fontVariantNumeric: 'tabular-nums', ...struck }}
          >
            {formatSatang(transaction.totalAmount)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <FavoriteButton transaction={transaction} showLabel={showFavoriteLabel} onNotice={onNotice} />
            {transaction.kind !== 'OPENING_BALANCE' && (
              <Link
                to={`/transactions/new?duplicateOf=${transaction.id}`}
                data-testid="row-duplicate"
                className="pt-pill-btn"
                style={{ textDecoration: 'none' }}
              >
                <Icon name="content_copy" size={0.95} />
                <span>Duplicate</span>
              </Link>
            )}
            {lineCount > 0 && (
              <button
                type="button"
                data-testid="history-expand"
                aria-expanded={expanded}
                aria-controls={linesId}
                onClick={() => setExpanded((value) => !value)}
                style={linkButton}
              >
                {expanded ? 'Hide lines' : `Show ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <ul
          id={linesId}
          style={{
            listStyle: 'none',
            margin: `${space[2]} 0 0`,
            padding: `${space[2]} ${space[3]}`,
            borderRadius: radius.md,
            backgroundColor: colors.porcelain,
          }}
        >
          {transaction.lines.map((line) => (
            <li
              key={line.id}
              data-testid="history-line"
              style={{ display: 'flex', justifyContent: 'space-between', gap: space[3], flexWrap: 'wrap', padding: `${space[1]} 0` }}
            >
              <span style={{ minWidth: 0, fontSize: font.size.sm, color: colors.textPrimary, overflowWrap: 'anywhere' }}>
                {line.targetAccountName}
                {line.note && <span style={{ color: colors.textMuted }}> · {line.note}</span>}
              </span>
              <span style={{ fontSize: font.size.sm, fontWeight: font.weight.semibold, fontVariantNumeric: 'tabular-nums', ...struck }}>
                {formatSatang(line.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};
