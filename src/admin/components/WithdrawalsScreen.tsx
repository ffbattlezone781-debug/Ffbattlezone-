import React, { useMemo, useState } from 'react';
import { Check, Copy, Phone, Trash2, Wallet, X } from 'lucide-react';
import type { UserRecord, WithdrawalRequest } from '../types';
import { formatTimestamp } from '../firebase';

interface WithdrawalsScreenProps {
  withdrawals: WithdrawalRequest[];
  users: UserRecord[];
  onApprove: (w: WithdrawalRequest) => Promise<void>;
  onReject: (w: WithdrawalRequest) => Promise<void>;
  onClear: (w: WithdrawalRequest) => Promise<void>;
  onClearBulk: (mode: 'processed' | 'all') => Promise<void>;
  busyId: string | null;
}

export const WithdrawalsScreen: React.FC<WithdrawalsScreenProps> = ({
  withdrawals,
  users,
  onApprove,
  onReject,
  onClear,
  onClearBulk,
  busyId,
}) => {
  const [filter, setFilter] = useState<'pending' | 'ALL' | 'approved' | 'rejected'>('pending');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<'processed' | 'all' | null>(null);
  const [confirmRowId, setConfirmRowId] = useState<string | null>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length;
  const processedCount = withdrawals.filter(
    (w) => w.status === 'approved' || w.status === 'rejected'
  ).length;
  const approvedTotal = withdrawals
    .filter((w) => w.status === 'approved')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  const filtered = withdrawals.filter((w) => (filter === 'ALL' ? true : w.status === filter));
  const bulkBusy = busyId === 'wd-clear-bulk';

  async function handleCopyText(key: string, value: string) {
    if (!value || value === '—') return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
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
            Verify player FF UID, FF Name, UPI ID, and Contact Number before processing payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
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
          <button
            type="button"
            disabled={bulkBusy || processedCount === 0}
            onClick={() => setConfirmBulk('processed')}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5 text-[#FFC107]" />
            Clear Processed ({processedCount})
          </button>
          <button
            type="button"
            disabled={bulkBusy || withdrawals.length === 0}
            onClick={() => setConfirmBulk('all')}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/15 px-3 text-xs font-bold text-[#FF8A80] transition hover:bg-[#FF3B30] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear All ({withdrawals.length})
          </button>
        </div>
      </div>

      {/* Inline Bulk Clear Confirmation */}
      {confirmBulk && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-white">
            {confirmBulk === 'processed'
              ? `Remove all ${processedCount} approved/rejected withdrawal request(s)? Pending payouts are untouched.`
              : `Remove ALL ${withdrawals.length} withdrawal request(s)? Note: deleting pending requests does NOT refund deducted coins (use Reject to refund).`}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={async () => {
                await onClearBulk(confirmBulk);
                setConfirmBulk(null);
              }}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#FF3B30] px-4 text-xs font-bold text-white disabled:opacity-50"
            >
              {bulkBusy ? 'Clearing...' : 'Confirm Clear'}
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setConfirmBulk(null)}
              className="inline-flex min-h-[38px] items-center rounded-xl border border-white/15 bg-white/5 px-3.5 text-xs font-bold text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
            const linkedUser = userById.get(w.userId);
            const ffName = w.userName || linkedUser?.name || '—';
            const ffUid = w.ffUid || linkedUser?.ffUid || '—';
            const contactNumber = w.phoneNumber || linkedUser?.phone || '—';

            return (
              <div
                key={w.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#12182B] p-5 transition hover:border-white/20 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-start">
                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      FF Name
                    </div>
                    <div className="mt-1 truncate text-base font-bold text-white">
                      {ffName}
                    </div>
                    {w.accountHolder && w.accountHolder !== ffName && (
                      <div className="mt-0.5 truncate text-xs text-slate-400">
                        Holder: {w.accountHolder}
                      </div>
                    )}
                    {w.paymentMethod && (
                      <div className="mt-0.5 text-xs font-semibold text-[#FF6B00]">
                        {w.paymentMethod}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      FF UID
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="truncate font-mono text-sm font-bold text-[#FFC107]">
                        {ffUid}
                      </span>
                      {ffUid !== '—' && (
                        <button
                          type="button"
                          onClick={() => void handleCopyText(`uid-${w.id}`, ffUid)}
                          title="Copy FF UID"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0A0A0F] text-slate-300 hover:border-[#FF6B00] hover:text-white"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {copiedKey === `uid-${w.id}` && (
                        <span className="text-[11px] font-bold text-[#00C853]">Copied</span>
                      )}
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
                        onClick={() => void handleCopyText(`upi-${w.id}`, w.upiId)}
                        title="Copy UPI ID"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0A0A0F] text-slate-300 hover:border-[#FF6B00] hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {copiedKey === `upi-${w.id}` && (
                        <span className="text-[11px] font-bold text-[#00C853]">Copied</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Contact Number
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[#00C853]" />
                      <span className="truncate font-mono text-sm font-bold text-slate-100">
                        {contactNumber}
                      </span>
                      {contactNumber !== '—' && (
                        <button
                          type="button"
                          onClick={() => void handleCopyText(`phone-${w.id}`, contactNumber)}
                          title="Copy Contact Number"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-[#0A0A0F] text-slate-300 hover:border-[#FF6B00] hover:text-white"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {copiedKey === `phone-${w.id}` && (
                        <span className="text-[11px] font-bold text-[#00C853]">Copied</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                      Amount &amp; Status
                    </div>
                    <div className="mt-1 font-mono text-xl font-bold tabular-nums text-[#FFC107]">
                      ₹{Number(w.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-300">
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

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        disabled={isBusy || bulkBusy}
                        onClick={() => void onApprove(w)}
                        className="inline-flex min-h-[46px] min-w-[116px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#00C853] px-4 py-2.5 text-sm font-bold text-[#04140A] shadow-lg shadow-[#00C853]/20 transition hover:brightness-110 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4 stroke-[2.5]" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || bulkBusy}
                        onClick={() => void onReject(w)}
                        className="inline-flex min-h-[46px] min-w-[110px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#FF3B30] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF3B30]/20 transition hover:brightness-110 disabled:opacity-50"
                      >
                        <X className="h-4 w-4 stroke-[2.5]" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <div className="text-right text-xs font-semibold text-slate-400">
                      {w.adminNote || 'Processed'}
                    </div>
                  )}

                  {confirmRowId === w.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy || bulkBusy}
                        onClick={async () => {
                          await onClear(w);
                          setConfirmRowId(null);
                        }}
                        className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-[#FF3B30] px-3 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Confirm Clear
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || bulkBusy}
                        onClick={() => setConfirmRowId(null)}
                        className="inline-flex min-h-[40px] items-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy || bulkBusy}
                      onClick={() => {
                        if (isPending) {
                          setConfirmRowId(w.id);
                        } else {
                          void onClear(w);
                        }
                      }}
                      className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 text-xs font-bold text-slate-300 transition hover:border-[#FF3B30]/50 hover:bg-[#FF3B30]/15 hover:text-[#FF8A80] disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
