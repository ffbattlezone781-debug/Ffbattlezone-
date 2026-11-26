import React from 'react';
import {
  Users,
  Trophy,
  TrendingUp,
  Clock,
  ArrowRight,
  Play,
  Check,
  X,
  Plus,
  Swords,
  Lock,
} from 'lucide-react';
import {
  getLobbyAllowedModes,
  getLobbyShortLabel,
  type AdminRole,
  type AdminScreen,
  type AssignedLobby,
  type DepositRequest,
  type Tournament,
  type TournamentStatus,
  type UserRecord,
  type WalletTransaction,
  type WithdrawalRequest,
} from '../types';
import { formatTimestamp } from '../firebase';

interface DashboardHomeProps {
  role: AdminRole;
  assignedLobby: AssignedLobby;
  users: UserRecord[];
  tournaments: Tournament[];
  transactions: WalletTransaction[];
  withdrawals: WithdrawalRequest[];
  depositRequests: DepositRequest[];
  onNavigate: (screen: AdminScreen) => void;
  onGoLive: (tournament: Tournament) => Promise<void>;
  onChangeTournamentStatus?: (tournament: Tournament, nextStatus: TournamentStatus) => Promise<void>;
  onApproveWithdrawal: (w: WithdrawalRequest) => Promise<void>;
  onRejectWithdrawal: (w: WithdrawalRequest) => Promise<void>;
  onApproveDeposit: (d: DepositRequest) => Promise<void>;
  busyId: string | null;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  role,
  assignedLobby,
  users,
  tournaments,
  transactions,
  withdrawals,
  depositRequests,
  onNavigate,
  onGoLive,
  onChangeTournamentStatus,
  onApproveWithdrawal,
  onRejectWithdrawal,
  onApproveDeposit,
  busyId,
}) => {
  const isLobbyManager = role === 'lobby_manager';
  const lobbyShort = getLobbyShortLabel(assignedLobby);
  const assignedLobbiesList = isLobbyManager ? getLobbyAllowedModes(assignedLobby) : [];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startMs = startOfToday.getTime();

  const todayEntryRevenue = transactions
    .filter((t) => {
      if (t.category !== 'entry' || t.status !== 'completed') return false;
      const ms = t.createdAt?.toMillis?.() ?? (t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0);
      return ms >= startMs;
    })
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalEntryRevenue = transactions
    .filter((t) => t.category === 'entry' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending');
  const pendingWithdrawAmount = pendingWithdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);
  const pendingDeposits = depositRequests.filter((d) => d.status === 'pending');

  const nowMs = Date.now();
  const activeTournaments = tournaments
    .filter((t) => {
      if (t.status !== 'live' && t.status !== 'upcoming') return false;
      const ts = Number(t.matchTimestampMs || 0);
      return ts <= 0 || nowMs < ts;
    })
    .sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (a.status !== 'live' && b.status === 'live') return 1;
      return (a.matchTimestampMs || 0) - (b.matchTimestampMs || 0);
    })
    .slice(0, isLobbyManager ? 10 : 6);

  const liveCount = tournaments.filter((t) => t.status === 'live').length;
  const upcomingCount = tournaments.filter((t) => t.status === 'upcoming').length;
  const completedCount = tournaments.filter((t) => t.status === 'completed').length;
  const totalSlotsJoined = tournaments.reduce((sum, t) => sum + Number(t.slotsFilled || 0), 0);
  const recentWithdrawals = withdrawals.slice(0, 6);
  const userById = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
            {isLobbyManager ? `Manager Dashboard` : 'Operations Overview'}
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {isLobbyManager
              ? `Sirf aapki assigned lobbies (${lobbyShort}) ke tournaments, Room ID aur joined players list manage karein.`
              : 'Real-time player signups, active rooms, daily revenue, and payout queues.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('create-tournament')}
            className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24]"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {isLobbyManager ? `Create Tournament` : 'Create Tournament'}
          </button>
        </div>
      </div>

      {/* Read-Only Assigned Lobbies Banner for Manager */}
      {isLobbyManager && (
        <div className="rounded-2xl border border-white/10 bg-[#12182B] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <Lock className="h-4 w-4 text-[#FF6B00]" />
              Your Assigned Lobbies (Read-Only)
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Admin-only assignment · Contact Admin to modify
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {assignedLobbiesList.map((lobby) => (
              <span
                key={lobby}
                className="inline-flex items-center rounded-lg border border-[#FF6B00]/45 bg-[#FF6B00]/15 px-3 py-1.5 font-mono text-xs font-bold text-[#FF9E5E] uppercase"
              >
                {lobby}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {isLobbyManager ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => onNavigate('manage-tournaments')}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left transition hover:border-[#FF6B00]/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                {lobbyShort} Tournaments
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF6B00]/15 text-[#FF6B00]">
                <Trophy className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
                {tournaments.length}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                Assigned Lobby: {lobbyShort}
              </div>
            </div>
          </button>

          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Live Matches
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00C853]/15 text-[#00C853]">
                <Play className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-[#00C853] sm:text-4xl">
                {liveCount}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                {upcomingCount} upcoming
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Players Joined
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFC107]/15 text-[#FFC107]">
                <Users className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
                {totalSlotsJoined}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                Across {lobbyShort} matches
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('results')}
            className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left transition hover:border-[#FFC107]/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Completed Matches
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <Check className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-sky-400 sm:text-4xl">
                {completedCount}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                Tap to view joined players
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => onNavigate('users')}
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left transition hover:border-[#FFC107]/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Total Users
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFC107]/15 text-[#FFC107]">
                <Users className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
                {users.length}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                {users.filter((u) => !u.banned).length} active · {users.filter((u) => u.banned).length} banned
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('manage-tournaments')}
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left transition hover:border-[#FF6B00]/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Total Tournaments
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF6B00]/15 text-[#FF6B00]">
                <Trophy className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-white sm:text-4xl">
                {tournaments.length}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                {liveCount} live now · {upcomingCount} upcoming
              </div>
            </div>
          </button>

          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Total Earning Today
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00C853]/15 text-[#00C853]">
                <TrendingUp className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-[#00C853] sm:text-4xl">
                ₹{todayEntryRevenue.toLocaleString('en-IN')}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                All-time entry revenue: <span className="font-mono font-bold text-slate-200">₹{totalEntryRevenue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('withdrawals')}
            className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 text-left transition hover:border-[#FF3B30]/50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Pending Withdrawals
              </span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF3B30]/15 text-[#FF3B30]">
                <Clock className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="font-mono text-3xl font-bold tabular-nums text-[#FFC107] sm:text-4xl">
                {pendingWithdrawals.length}
              </div>
              <div className="mt-1.5 text-xs font-medium text-slate-400">
                Queue value: <span className="font-mono font-bold text-white">₹{pendingWithdrawAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Pending QR Deposits Alert Strip (Super Admin Only) */}
      {!isLobbyManager && pendingDeposits.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#FFC107]/35 bg-[#12182B] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-[#FFC107]">
              {pendingDeposits.length} Pending QR Deposit Verification{pendingDeposits.length > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-slate-300">
              Latest: {pendingDeposits[0].userName} sent ₹{pendingDeposits[0].amount} ({pendingDeposits[0].paymentApp} · UTR {pendingDeposits[0].utrNumber})
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busyId === `dep-${pendingDeposits[0].id}`}
              onClick={() => void onApproveDeposit(pendingDeposits[0])}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#00C853] px-4 py-2 text-xs font-bold text-[#05180B] transition hover:brightness-110 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Quick Approve ₹{pendingDeposits[0].amount}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('deposits')}
              className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
            >
              View All Deposits
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Below: Live Tournaments List (+ Recent Withdrawals for Super Admin ONLY) */}
      <div className={`grid grid-cols-1 gap-6 ${isLobbyManager ? '' : 'lg:grid-cols-2 lg:items-stretch'}`}>
        {/* Live & Upcoming Tournaments List */}
        <section className="flex flex-col rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Swords className="h-5 w-5 text-[#FF6B00]" />
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-wide text-white">
                {isLobbyManager ? `${lobbyShort} Live & Upcoming Matches` : 'Live & Upcoming Tournaments'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('manage-tournaments')}
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-[#FF6B00] hover:underline"
            >
              Manage All
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeTournaments.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-slate-400">No active tournaments right now.</p>
              <button
                type="button"
                onClick={() => onNavigate('create-tournament')}
                className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-2 text-xs font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Publish First Match
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTournaments.map((t) => {
                const total = Math.max(1, Number(t.slotsTotal || 1));
                const filled = Math.max(0, Number(t.slotsFilled || 0));
                const pct = Math.min(100, Math.round((filled / total) * 100));
                const isLive = t.status === 'live';

                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-white/10 bg-[#0A0A0F]/65 p-4 transition hover:border-white/20"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-[family-name:var(--font-display)] text-sm font-bold text-white">
                            {t.name}
                          </span>
                          <span
                            className={`text-[11px] font-bold uppercase ${
                              isLive ? 'text-[#00C853]' : 'text-[#FFC107]'
                            }`}
                          >
                            {isLive ? 'LIVE' : 'UPCOMING'}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {t.mode} · {t.map} · {t.matchDate} {t.matchTime} · Entry{' '}
                          <span className="font-mono font-bold text-white">₹{t.entryFee}</span> · Prize{' '}
                          <span className="font-mono font-bold text-[#FFC107]">₹{t.prizePool}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isLive ? (
                          onChangeTournamentStatus && (
                            <button
                              type="button"
                              disabled={busyId === `status-${t.id}` || busyId === `live-${t.id}`}
                              onClick={() => void onChangeTournamentStatus(t, 'upcoming')}
                              className="inline-flex min-h-[36px] items-center gap-1 whitespace-nowrap rounded-lg bg-[#FFC107]/15 px-3 py-1.5 text-xs font-bold text-[#FFC107] transition hover:bg-[#FFC107] hover:text-[#0A0A0F] disabled:opacity-50"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              Set Upcoming
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === `live-${t.id}` || busyId === `status-${t.id}`}
                            onClick={() =>
                              onChangeTournamentStatus
                                ? void onChangeTournamentStatus(t, 'live')
                                : void onGoLive(t)
                            }
                            className="inline-flex min-h-[36px] items-center gap-1 whitespace-nowrap rounded-lg bg-[#00C853]/15 px-3 py-1.5 text-xs font-bold text-[#00C853] transition hover:bg-[#00C853] hover:text-[#04140A] disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Go Live
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Slots Progress Bar */}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Slots Filled</span>
                        <span className="font-mono font-bold tabular-nums text-white">
                          {filled} / {total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFC107] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Withdrawals (Super Admin Only) */}
        {!isLobbyManager && (
        <section className="flex flex-col rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-[#FFC107]" />
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-wide text-white">
                Recent Withdrawals
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('withdrawals')}
              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-[#FF6B00] hover:underline"
            >
              Open Full Queue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentWithdrawals.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-slate-400">
              No withdrawal requests submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentWithdrawals.map((w) => {
                const linkedUser = userById.get(w.userId);
                const ffName = w.userName || linkedUser?.name || '—';
                const ffUid = w.ffUid || linkedUser?.ffUid || '—';
                const contactNum = w.phoneNumber || linkedUser?.phone || '—';
                return (
                <div
                  key={w.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#0A0A0F]/65 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <div className="truncate text-sm font-bold text-white">
                        {ffName}{' '}
                        <span className="font-mono text-xs font-semibold text-[#FFC107]">
                          (FF UID: {ffUid})
                        </span>
                      </div>
                      <div className="truncate font-mono text-xs text-slate-200">
                        UPI: {w.upiId}
                      </div>
                      <div className="truncate font-mono text-xs text-slate-300">
                        Contact: {contactNum}
                      </div>
                      <div className="pt-0.5 text-xs text-slate-400">{formatTimestamp(w.createdAt)}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-lg font-bold tabular-nums text-[#FFC107]">
                        ₹{Number(w.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div
                        className={`mt-0.5 text-[11px] font-bold uppercase ${
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

                  {w.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={busyId === `wd-${w.id}`}
                        onClick={() => void onApproveWithdrawal(w)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#00C853] px-3 py-2 text-xs font-bold text-[#04140A] transition hover:brightness-110 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === `wd-${w.id}`}
                        onClick={() => void onRejectWithdrawal(w)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-[#FF3B30] px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
};
