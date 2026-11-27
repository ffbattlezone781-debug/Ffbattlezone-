import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Gift, Search, Users } from 'lucide-react';
import { formatTimestamp } from '../firebase';
import type { ReferralRecord } from '../types';

interface ReferralsScreenProps {
  referrals: ReferralRecord[];
}

export const ReferralsScreen: React.FC<ReferralsScreenProps> = ({ referrals }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const stats = useMemo(() => {
    const total = referrals.length;
    const paidList = referrals.filter((r) => r.referrerBonusStatus === 'paid');
    const pendingList = referrals.filter((r) => r.referrerBonusStatus !== 'paid');
    const totalPaidAmount = paidList.reduce(
      (sum, r) => sum + Number(r.referrerBonusAmount || 3),
      0
    );
    return {
      total,
      depositedCount: referrals.filter((r) => r.hasDeposited).length,
      paidCount: paidList.length,
      pendingCount: pendingList.length,
      totalPaidAmount,
    };
  }, [referrals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return referrals.filter((r) => {
      if (statusFilter === 'paid' && r.referrerBonusStatus !== 'paid') return false;
      if (statusFilter === 'pending' && r.referrerBonusStatus === 'paid') return false;
      if (!q) return true;
      return (
        String(r.referrerName || '').toLowerCase().includes(q) ||
        String(r.referrerCode || '').toLowerCase().includes(q) ||
        String(r.referredName || '').toLowerCase().includes(q) ||
        String(r.referredEmail || '').toLowerCase().includes(q)
      );
    });
  }, [referrals, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#12182B] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00C853]/15 text-[#69F0AE]">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
              Referral List &amp; First-Deposit Bonus Tracker
            </h2>
            <p className="text-xs text-slate-400">
              Kisne kisko refer kiya · Deposit hua ya nahi · Referrer ₹3 Bonus Mila ya Pending
            </p>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#12182B] p-4">
          <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Total Referrals
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#12182B] p-4">
          <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Deposit Completed
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#69F0AE]">
            {stats.depositedCount}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#12182B] p-4">
          <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Bonus Mila (Paid)
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#FFC107]">
            ₹{stats.totalPaidAmount.toLocaleString('en-IN')}{' '}
            <span className="text-xs font-semibold text-slate-400">({stats.paidCount})</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#12182B] p-4">
          <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Bonus Pending
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-[#FF6B00]">
            {stats.pendingCount}
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#12182B] p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search referrer name, code, or referred friend..."
            className="min-h-[42px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] py-2 pr-3 pl-10 text-sm text-white placeholder-slate-500 outline-none focus:border-[#FF6B00]"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'paid', 'pending'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`min-h-[38px] rounded-xl px-3.5 text-xs font-bold transition ${
                statusFilter === tab
                  ? 'bg-[#FF6B00] text-white'
                  : 'border border-white/10 bg-[#0A0A0F] text-slate-300 hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'paid' ? 'Bonus Mila' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* Referral List */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12182B]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <Users className="h-9 w-9 text-slate-500" />
            <div className="text-sm font-bold text-slate-200">No Referral Records Found</div>
            <p className="max-w-md text-xs text-slate-400">
              Jab koi naya user Refer Code use karke signup karega, uska record aur first-deposit bonus status yahan show hoga.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0A0A0F]/60 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-5 py-3.5">Referrer (Kisne Kiya)</th>
                    <th className="px-5 py-3.5">Referred Friend (Kisko Kiya)</th>
                    <th className="px-5 py-3.5">Deposit Status</th>
                    <th className="px-5 py-3.5">Refer Bonus (₹3)</th>
                    <th className="px-5 py-3.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {filtered.map((r) => {
                    const isPaid = r.referrerBonusStatus === 'paid';
                    return (
                      <tr key={r.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{r.referrerName}</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-[#FFC107]">
                            Code: {r.referrerCode}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{r.referredName}</div>
                          <div className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400">
                            {r.referredEmail || r.referredUid}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {r.hasDeposited ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#00C853]/15 px-2.5 py-1 text-xs font-bold text-[#69F0AE]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Deposit Hua (₹{Number(r.firstDepositAmount || 0)})
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300">
                              <Clock className="h-3.5 w-3.5" />
                              Deposit Nahi Hua
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#FFC107]/15 px-2.5 py-1 text-xs font-bold text-[#FFC107]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              ₹{Number(r.referrerBonusAmount || 3)} Mila
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#FF6B00]/15 px-2.5 py-1 text-xs font-bold text-[#FF8A47]">
                              <Clock className="h-3.5 w-3.5" />
                              Pending (1st Deposit)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right text-xs text-slate-400">
                          <div>{formatTimestamp(r.createdAt)}</div>
                          {isPaid && r.bonusPaidAt && (
                            <div className="mt-0.5 text-[11px] text-[#69F0AE]">
                              Paid: {formatTimestamp(r.bonusPaidAt)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-white/10 md:hidden">
              {filtered.map((r) => {
                const isPaid = r.referrerBonusStatus === 'paid';
                return (
                  <div key={r.id} className="space-y-2.5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-400">
                          Referrer:{' '}
                          <span className="font-bold text-white">{r.referrerName}</span>{' '}
                          <span className="font-mono text-[#FFC107]">({r.referrerCode})</span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-400">
                          Referred:{' '}
                          <span className="font-bold text-white">{r.referredName}</span>
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {r.referredEmail || r.referredUid}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          isPaid
                            ? 'bg-[#FFC107]/15 text-[#FFC107]'
                            : 'bg-[#FF6B00]/15 text-[#FF8A47]'
                        }`}
                      >
                        {isPaid ? `₹${Number(r.referrerBonusAmount || 3)} Mila` : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={r.hasDeposited ? 'font-bold text-[#69F0AE]' : 'text-slate-400'}>
                        {r.hasDeposited
                          ? `Deposit Hua (₹${Number(r.firstDepositAmount || 0)})`
                          : 'Deposit Nahi Hua'}
                      </span>
                      <span className="text-slate-500">{formatTimestamp(r.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
