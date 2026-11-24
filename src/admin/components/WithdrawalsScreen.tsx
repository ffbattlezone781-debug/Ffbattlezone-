import React, { useState } from 'react';
import { Check, Copy, Wallet, X } from 'lucide-react';
import type { WithdrawalRequest } from '../types';
import { formatTimestamp } from '../firebase';

interface WithdrawalsScreenProps {
  withdrawals: WithdrawalRequest[];
  onApprove: (w: WithdrawalRequest) => Promise<void>;
  onReject: (w: WithdrawalRequest) => Promise<void>;
  busyId: string | null;
}

export const WithdrawalsScreen: React.FC<WithdrawalsScreenProps> = ({
  withdrawals,
  onApprove,
  onReject,
  busyId,
}) => {
  const [filter, setFilter] = useState<'pending' | 'ALL' | 'approved' | 'rejected'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const approvedTotal = withdrawals
    .filter((w) => w.status === 'approved')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const filtered = withdrawals.filter((w) => (filter === 'ALL' ? true : w.status === filter));

  async function handleCopyUpi(w: WithdrawalRequest) {
    try {
      await navigator.clipboard.writeText(w.upiId);
      setCopiedId(w.id);
      setTimeout(() => setCopiedId((prev) => (prev === w.id ? null : prev)), 1800);
    } catch {
      // Clipboard blocked in non-HTTPS contexts
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
            Withdrawal Requests
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Verify player UPI IDs and process payouts with one click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
          <span>
            Pending Queue:{' '}
            <strong className="font-mono text-sm font-bold tabular-nums text-[#FFC107]">
              {pendingCount}
            </strong>
          </span>
          <span>
            Paid Out:{' '}
            <strong className="font-mono text-sm font-bold tabular-nums text-[#00C853]">
              ₹{approvedTotal.toLocaleString('en-IN')}
            </strong>
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-[#12182B] p-2">
        {(['pending', 'ALL', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`min-h-[40px] whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold capitalize transition ${
              filter === tab
                ? 'bg-[#FF6B00] text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {tab === 'ALL'
              ? `All (${withdrawals.length})`
              : tab === 'pending'
              ? `Pending (${pendingCount})`
              : tab}
          </button>
        ))}
      </div>

      {/* Clear List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#12182B] p-12 text-center">
          <Wallet className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <p className="text-sm font-semibold text-slate-300">
            No {filter === 'ALL' ? '' : filter} withdrawal requests found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => {
            const isBusy = busyId === `wd-${w.id}`;
            const isPending = w.status === 'pending';

            return (
              <div
                key={w.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#12182B] p-5 transition hover:border-white/20 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Player Name
                    </div>
                    <div className="mt-1 truncate text-base font-bold text-white">
                      {w.userName}
                    </div>
                    {w.paymentMethod && (
                      <div className="mt-0.5 text-xs text-slate-400">{w.paymentMethod}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Amount
                    </div>
                    <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#FFC107]">
                      ₹{Number(w.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      UPI ID
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="truncate font-mono text-sm font-bold text-slate-100">
                        {w.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleCopyUpi(w)}
                        title="Copy UPI ID"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0A0A0F] text-slate-300 hover:border-[#FF6B00] hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {copiedId === w.id && (
                        <span className="text-[11px] font-bold text-[#00C853]">Copied</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Requested Time
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-200">
                      {formatTimestamp(w.createdAt)}
                    </div>
                    <div
                      className={`mt-0.5 text-xs font-bold uppercase ${
                        w.status === 'approved'
                          ? 'text-[#00C853]'
                          : w.status === 'rejected'
                          ? 'text-[#FF3B30]'
                          : 'text-[#FFC107]'
                      }`}
                    >
                      {w.status}
                    </div>
                  </div>
                </div>

                {/* Big GREEN Approve & RED Reject Buttons */}
                {isPending ? (
                  <div className="grid grid-cols-2 gap-3 lg:flex lg:shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onApprove(w)}
                      className="inline-flex min-h-[48px] min-w-[132px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#00C853] px-5 py-2.5 text-sm font-bold text-[#04140A] shadow-lg shadow-[#00C853]/20 transition hover:brightness-110 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4 stroke-[2.5]" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void onReject(w)}
                      className="inline-flex min-h-[48px] min-w-[132px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#FF3B30] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF3B30]/20 transition hover:brightness-110 disabled:opacity-50"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="shrink-0 text-right text-xs font-semibold text-slate-400">
                    {w.adminNote || 'Processed'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
