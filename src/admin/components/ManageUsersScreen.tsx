import React, { useState } from 'react';
import { Minus, Plus, Search, ShieldBan, ShieldCheck, Wallet, X } from 'lucide-react';
import type { UserRecord } from '../types';
import { getWithdrawableBalance } from '../firebase';

interface ManageUsersScreenProps {
  users: UserRecord[];
  onToggleBan: (user: UserRecord) => Promise<void>;
  onCreditDeposit: (user: UserRecord, amount: number, note?: string) => Promise<void>;
  onCreditBonus: (user: UserRecord, amount: number, note?: string) => Promise<void>;
  onDeductCoins: (user: UserRecord, amount: number, note?: string) => Promise<void>;
  busyId: string | null;
}

const PRESET_AMOUNTS = [10, 50, 100, 500, 1000, 5000];

export const ManageUsersScreen: React.FC<ManageUsersScreenProps> = ({
  users,
  onToggleBan,
  onCreditDeposit,
  onCreditBonus,
  onDeductCoins,
  busyId,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'active' | 'banned'>('ALL');
  const [walletUserId, setWalletUserId] = useState<string | null>(null);
  const [walletAction, setWalletAction] = useState<'add' | 'deduct'>('add');
  const [coinType, setCoinType] = useState<'deposit' | 'winning'>('deposit');
  const [customAmount, setCustomAmount] = useState<string>('100');
  const [customNote, setCustomNote] = useState<string>('');
  const [modalError, setModalError] = useState<string>('');

  const walletUser = walletUserId
    ? users.find((u) => u.id === walletUserId) || null
    : null;

  const filtered = users.filter((u) => {
    const statusOk =
      filter === 'ALL' ? true : filter === 'banned' ? Boolean(u.banned) : !u.banned;
    const q = search.trim().toLowerCase();
    const match =
      !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.ffUid || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q);
    return statusOk && match;
  });

  function openWalletModal(u: UserRecord) {
    setWalletUserId(u.id);
    setWalletAction('add');
    setCoinType('deposit');
    setCustomAmount('100');
    setCustomNote('');
    setModalError('');
  }

  async function handleWalletSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletUser) return;
    setModalError('');

    const parsed = Math.floor(Number(customAmount));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setModalError('Enter a valid coin amount greater than 0.');
      return;
    }

    if (walletAction === 'deduct') {
      if (Number(walletUser.walletBalance || 0) <= 0) {
        setModalError('User wallet balance is already ₹0.');
        return;
      }
      await onDeductCoins(walletUser, parsed, customNote);
      setWalletUserId(null);
      return;
    }

    if (coinType === 'winning') {
      await onCreditBonus(walletUser, parsed, customNote);
    } else {
      await onCreditDeposit(walletUser, parsed, customNote);
    }
    setWalletUserId(null);
  }

  const parsedPreviewAmount = Math.max(0, Math.floor(Number(customAmount) || 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
            Manage Users
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Search players, add or adjust any amount of coins in their wallet, or Ban/Unban accounts.
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#12182B] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Name, FF UID, Mobile, Email..."
            className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 rounded-xl bg-[#0A0A0F] p-1">
          {(['ALL', 'active', 'banned'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`min-h-[38px] rounded-lg px-3.5 text-xs font-bold capitalize transition ${
                filter === tab ? 'bg-[#FF6B00] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? `All (${users.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12182B]">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No players found.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0A0A0F]/60 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">FF UID</th>
                    <th className="px-5 py-3.5">Mobile / Account</th>
                    <th className="px-5 py-3.5 text-right">Wallet Balance</th>
                    <th className="px-5 py-3.5 text-right">Coins &amp; Ban Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {filtered.map((u) => {
                    const winBal = getWithdrawableBalance(u);
                    const depBal = Math.max(0, Number(u.walletBalance || 0) - winBal);

                    return (
                      <tr key={u.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {u.rank} · {u.matches} Matches · {u.kills} Kills
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-sm font-bold text-slate-200">
                          {u.ffUid}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-semibold text-white">
                            {u.phone || 'No Mobile'}
                          </div>
                          <div className="max-w-[210px] truncate text-xs text-slate-400">
                            {u.email || u.uid}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="font-mono text-base font-bold tabular-nums text-[#FFC107]">
                            ₹{Number(u.walletBalance || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400">
                            Win ₹{winBal} · Dep ₹{depBal}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openWalletModal(u)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#FFC107]/40 bg-[#FFC107]/15 px-3.5 py-1.5 text-xs font-bold text-[#FFC107] transition hover:bg-[#FFC107] hover:text-[#0A0A0F]"
                            >
                              <Wallet className="h-3.5 w-3.5" />
                              Add / Edit Coins
                            </button>
                            <button
                              type="button"
                              disabled={busyId === `ban-${u.id}`}
                              onClick={() => void onToggleBan(u)}
                              className={`inline-flex min-h-[38px] min-w-[104px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                                u.banned
                                  ? 'bg-[#00C853] text-[#04140A] hover:brightness-110'
                                  : 'bg-[#FF3B30] text-white hover:brightness-110'
                              }`}
                            >
                              {u.banned ? (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Unban
                                </>
                              ) : (
                                <>
                                  <ShieldBan className="h-3.5 w-3.5" />
                                  Ban User
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile User Rows */}
            <div className="divide-y divide-white/10 md:hidden">
              {filtered.map((u) => {
                const winBal = getWithdrawableBalance(u);
                const depBal = Math.max(0, Number(u.walletBalance || 0) - winBal);

                return (
                  <div key={u.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{u.name}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-300">FF UID: {u.ffUid}</div>
                        <div className="truncate text-xs text-slate-400">{u.phone || u.email || u.uid}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-base font-bold text-[#FFC107]">
                          ₹{Number(u.walletBalance || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Win ₹{winBal} · Dep ₹{depBal}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openWalletModal(u)}
                        className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#FFC107]/15 text-xs font-bold text-[#FFC107]"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        Add / Edit Coins
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `ban-${u.id}`}
                        onClick={() => void onToggleBan(u)}
                        className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${
                          u.banned ? 'bg-[#00C853] text-[#04140A]' : 'bg-[#FF3B30] text-white'
                        }`}
                      >
                        {u.banned ? 'Unban' : 'Ban User'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Unlimited Custom Coin Credit / Adjust Modal */}
      {walletUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWalletUserId(null);
          }}
        >
          <form
            onSubmit={(e) => void handleWalletSubmit(e)}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12182B] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                  Manage Wallet · {walletUser.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  FF UID: <span className="font-mono text-slate-200">{walletUser.ffUid}</span> · Balance:{' '}
                  <span className="font-mono font-bold text-[#FFC107]">
                    ₹{Number(walletUser.walletBalance || 0).toLocaleString('en-IN')}
                  </span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Modal"
                onClick={() => setWalletUserId(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-3.5 py-2.5 text-xs font-bold text-[#FF8A80]">
                {modalError}
              </div>
            )}

            {/* Add vs Deduct Action Toggle */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0A0A0F] p-1.5">
              <button
                type="button"
                onClick={() => setWalletAction('add')}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                  walletAction === 'add'
                    ? 'bg-[#00C853] text-[#04140A]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="h-4 w-4" />
                Add Coins
              </button>
              <button
                type="button"
                onClick={() => setWalletAction('deduct')}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                  walletAction === 'deduct'
                    ? 'bg-[#FF3B30] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minus className="h-4 w-4" />
                Deduct Coins
              </button>
            </div>

            {/* Coin Type Selector (when Adding) */}
            {walletAction === 'add' && (
              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                  Coin Wallet Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCoinType('deposit')}
                    className={`min-h-[46px] rounded-xl border px-3 py-2 text-left transition ${
                      coinType === 'deposit'
                        ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-white'
                        : 'border-white/15 bg-[#0A0A0F] text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Play Coins</div>
                    <div className="text-[10px] opacity-80">For joining matches</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoinType('winning')}
                    className={`min-h-[46px] rounded-xl border px-3 py-2 text-left transition ${
                      coinType === 'winning'
                        ? 'border-[#00C853] bg-[#00C853]/15 text-white'
                        : 'border-white/15 bg-[#0A0A0F] text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Winning Coins</div>
                    <div className="text-[10px] opacity-80">Withdrawable + Play</div>
                  </button>
                </div>
              </div>
            )}

            {/* Custom Unlimited Coin Amount Input */}
            <div className="mt-4">
              <label
                htmlFor="custom-coin-amount"
                className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-300 uppercase"
              >
                Enter Any Coin Amount (₹)
              </label>
              <input
                id="custom-coin-amount"
                type="number"
                min={1}
                step={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount (e.g. 250, 2000, 10000)"
                className="min-h-[50px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-lg font-bold tabular-nums text-[#FFC107] placeholder:text-sm placeholder:font-normal placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
              />

              {/* Quick Preset Chips */}
              <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomAmount(String(amt))}
                    className={`min-h-[34px] rounded-lg border font-mono text-xs font-bold transition ${
                      Number(customAmount) === amt
                        ? 'border-[#FF6B00] bg-[#FF6B00]/20 text-white'
                        : 'border-white/10 bg-[#0A0A0F] text-slate-300 hover:border-white/25'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div className="mt-4">
              <label
                htmlFor="custom-coin-note"
                className="mb-1.5 block text-[11px] font-bold tracking-wider text-slate-300 uppercase"
              >
                Note / Reason (Optional)
              </label>
              <input
                id="custom-coin-note"
                type="text"
                maxLength={55}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Promo Reward, Refund, VIP Bonus"
                className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={busyId === `user-credit-${walletUser.id}`}
                className={`min-h-[50px] w-full rounded-xl px-4 font-[family-name:var(--font-display)] text-sm font-bold tracking-wide transition disabled:opacity-50 ${
                  walletAction === 'deduct'
                    ? 'bg-[#FF3B30] text-white hover:brightness-110'
                    : coinType === 'winning'
                    ? 'bg-[#00C853] text-[#04140A] hover:brightness-110'
                    : 'bg-[#FF6B00] text-white hover:bg-[#ff7f24]'
                }`}
              >
                {busyId === `user-credit-${walletUser.id}`
                  ? 'Updating Wallet...'
                  : walletAction === 'deduct'
                  ? `Deduct ₹${parsedPreviewAmount.toLocaleString('en-IN')} Coins`
                  : coinType === 'winning'
                  ? `Add ₹${parsedPreviewAmount.toLocaleString('en-IN')} Winning Coins`
                  : `Add ₹${parsedPreviewAmount.toLocaleString('en-IN')} Play Coins`}
              </button>
              <button
                type="button"
                onClick={() => setWalletUserId(null)}
                className="min-h-[42px] rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
