import React from 'react';
import { formatSatang } from '../utils/money';
import { colors, font, radius, space } from '../styles/theme';

/** A negative balance carries a text label, never colour alone (D-02, NFR-08). */
export const NegativeLabel: React.FC = () => (
  <span
    style={{
      fontSize: font.size.xs,
      fontWeight: font.weight.semibold,
      color: '#8B2525',
      backgroundColor: '#FBEAEA',
      borderRadius: radius.full,
      padding: '0.1rem 0.5rem',
      whiteSpace: 'nowrap',
    }}
  >
    Negative balance
  </span>
);

/** An amount in THB (`1,250.50 ฿`) with the negative-balance label when it is below zero. */
export const Amount: React.FC<{ satang: number; size: string; testId?: string }> = ({ satang, size, testId }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
    <span
      data-testid={testId}
      style={{ fontSize: size, fontWeight: font.weight.bold, color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}
    >
      {formatSatang(satang)}
    </span>
    {satang < 0 && <NegativeLabel />}
  </span>
);
