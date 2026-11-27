import type { QueryClient } from '@tanstack/react-query';
import { accountsQueryKey } from './accounts.api';
import { favoritesQueryKey, transactionsQueryKey } from './transactions.api';
import { summaryQueryKey } from './summary.api';
import { loansQueryKey } from './loans.api';

/**
 * Every query whose data a Payment or Receipt write changes: balances, history (list, detail
 * and favorites), the summary and the loans overview (f-13 §2.2, f-15 §2.2).
 */
export async function invalidateLedgerQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
    queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
    queryClient.invalidateQueries({ queryKey: favoritesQueryKey }),
    queryClient.invalidateQueries({ queryKey: summaryQueryKey }),
    queryClient.invalidateQueries({ queryKey: loansQueryKey }),
  ]);
}
