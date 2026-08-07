import { CheckCircle2, RefreshCw, Trash2, Clock, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { QueuedSyncItem } from '@/hooks/useOfflineSync';

interface SyncReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: QueuedSyncItem[];
  isSyncing: boolean;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}

// Derives the sale's gross amount from the queued payload. The payload doesn't
// carry a single "total" field, so reconstruct it from the payment breakdown:
// split sales spread across cash/mpesa/bank, everything else is amountPaid plus
// any outstanding balance (credit/hold).
function saleAmount(data: any): number {
  const paid = Number(data?.amountPaid) || 0;
  const outstanding = Number(data?.outstandingBalance) || 0;
  const mpesa = Number(data?.mpesaTotal) || 0;
  const bank = Number(data?.bankTotal) || 0;
  const method = String(data?.paymentType || data?.paymentTag || '').toLowerCase();
  if (method === 'split') return paid + mpesa + bank;
  return paid + outstanding;
}

function paymentLabel(data: any): string {
  const method = String(data?.paymentType || data?.paymentTag || '').toLowerCase();
  if (data?.status === 'hold') return 'Hold';
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'mpesa':
      return 'M-Pesa';
    case 'bank':
      return 'Bank';
    case 'credit':
      return 'Credit';
    case 'split':
      return 'Split';
    default:
      return method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Sale';
  }
}

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function itemTimestamp(item: QueuedSyncItem): number {
  const created = item?.data?.createdAt;
  const parsed = created ? Date.parse(created) : NaN;
  return Number.isNaN(parsed) ? item.timestamp : parsed;
}

function typeLabel(item: QueuedSyncItem): string {
  switch (item.type) {
    case 'transaction':
      return 'Sale';
    case 'customer':
      return 'Customer';
    case 'product_update':
      return 'Product update';
    default:
      return item.type;
  }
}

export function SyncReviewPanel({
  open,
  onOpenChange,
  items,
  isSyncing,
  onRetry,
  onDiscard,
}: SyncReviewPanelProps) {
  const failed = items.filter((i) => i.status === 'failed');
  const pending = items.filter((i) => i.status === 'pending' || i.status === 'syncing');

  const renderItem = (item: QueuedSyncItem) => {
    const isSale = item.type === 'transaction';
    const isFailed = item.status === 'failed';
    return (
      <div
        key={item.id}
        data-testid={`row-sync-item-${item.id}`}
        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground" data-testid={`text-sync-amount-${item.id}`}>
              {isSale ? `Ksh ${saleAmount(item.data).toFixed(2)}` : typeLabel(item)}
            </span>
            {isSale && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {paymentLabel(item.data)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span data-testid={`text-sync-time-${item.id}`}>{formatTime(itemTimestamp(item))}</span>
            {isFailed && item.recoveredFromLegacy && (
              <span
                className="ml-1 inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400"
                data-testid={`text-sync-recovered-${item.id}`}
              >
                <AlertTriangle className="h-3 w-3" />
                Recovered from before the update — retry to send, or discard
              </span>
            )}
            {isFailed && !item.recoveredFromLegacy && (
              <span className="ml-1 inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" />
                Failed after {item.retries} attempt{item.retries !== 1 ? 's' : ''}
              </span>
            )}
            {!isFailed && (
              <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                {isSyncing ? 'Syncing…' : 'Waiting to sync'}
              </span>
            )}
          </div>
        </div>

        {isFailed && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              disabled={isSyncing}
              data-testid={`button-retry-sync-${item.id}`}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
              Retry
            </button>
            <button
              type="button"
              onClick={() => onDiscard(item.id)}
              data-testid={`button-discard-sync-${item.id}`}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Discard
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="dialog-sync-review">
        <DialogHeader>
          <DialogTitle>Sales waiting to sync</DialogTitle>
          <DialogDescription>
            Review queued sales, retry ones that got stuck, or discard ones you don't need.
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-10 text-center"
            data-testid="text-sync-all-clear"
          >
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium text-foreground">Everything is synced</p>
            <p className="text-sm text-muted-foreground">
              No sales are waiting. New offline sales will appear here until they reach the server.
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {failed.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  Needs attention ({failed.length})
                </h3>
                <div className="space-y-2">{failed.map(renderItem)}</div>
              </section>
            )}
            {pending.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Waiting to sync ({pending.length})
                </h3>
                <div className="space-y-2">{pending.map(renderItem)}</div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
