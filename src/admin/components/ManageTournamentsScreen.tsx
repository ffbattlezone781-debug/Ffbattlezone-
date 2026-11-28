import React, { useState } from 'react';
import { RosterTableSkeleton } from './AdminSkeletons';
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  Plus,
  X,
  KeyRound,
  Save,
  RotateCcw,
  Power,
} from 'lucide-react';
import {
  getLobbyAllowedModes,
  getLobbyShortLabel,
  MATCH_TYPES,
  normalizeTournamentMode,
  TOURNAMENT_MAPS,
  TOURNAMENT_VERSIONS,
  type AdminScreen,
  type AssignedLobby,
  type Tournament,
  type TournamentJoin,
  type TournamentMatchType,
  type TournamentMode,
  type TournamentRoom,
  type TournamentStatus,
  type TournamentVersion,
} from '../types';

export interface EditTournamentPayload {
  id: string;
  name: string;
  mode: TournamentMode;
  matchType: TournamentMatchType;
  version: TournamentVersion;
  map: string;
  entryFee: number;
  perKillPrize: number;
  prizePool: number;
  slotsTotal: number;
  status: TournamentStatus;
  matchDate: string;
  matchTime: string;
  matchTimestampMs: number;
  roomId: string;
  roomPassword: string;
}

interface ManageTournamentsScreenProps {
  assignedLobby: AssignedLobby;
  tournaments: Tournament[];
  onNavigate: (screen: AdminScreen) => void;
  onFetchTournamentDetails: (tId: string) => Promise<{
    room: TournamentRoom | null;
    joins: TournamentJoin[];
  }>;
  onSaveEdit: (payload: EditTournamentPayload) => Promise<boolean>;
  onSaveRoomOnly: (tId: string, roomId: string, roomPassword: string) => Promise<void>;
  onToggleTournamentStatus?: (t: Tournament) => Promise<void>;
  onChangeTournamentStatus?: (t: Tournament, nextStatus: TournamentStatus) => Promise<void>;
  onDeleteTournament: (t: Tournament) => Promise<void>;
  onCancelAndRefundAll: (t: Tournament) => Promise<void>;
  busyId: string | null;
}

export const ManageTournamentsScreen: React.FC<ManageTournamentsScreenProps> = ({
  assignedLobby,
  tournaments,
  onNavigate,
  onFetchTournamentDetails,
  onSaveEdit,
  onSaveRoomOnly,
  onToggleTournamentStatus,
  onChangeTournamentStatus,
  onDeleteTournament,
  onCancelAndRefundAll,
  busyId,
}) => {
  const availableModes = getLobbyAllowedModes(assignedLobby);
  const [statusFilter, setStatusFilter] = useState<'ALL' | TournamentStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // View modal state
  const [viewTarget, setViewTarget] = useState<Tournament | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewJoins, setViewJoins] = useState<TournamentJoin[]>([]);
  const [viewRoomId, setViewRoomId] = useState('');
  const [viewRoomPass, setViewRoomPass] = useState('');

  // Edit modal state
  const [editTarget, setEditTarget] = useState<Tournament | null>(null);
  const [editName, setEditName] = useState('');
  const [editMode, setEditMode] = useState<TournamentMode>('FULL MAP');
  const [editMatchType, setEditMatchType] = useState<TournamentMatchType>('Solo');
  const [editVersion, setEditVersion] = useState<TournamentVersion>('TPP');
  const [editMap, setEditMap] = useState('Bermuda');
  const [editEntry, setEditEntry] = useState('0');
  const [editKill, setEditKill] = useState('0');
  const [editPrize, setEditPrize] = useState('0');
  const [editSlots, setEditSlots] = useState('48');
  const [editStatus, setEditStatus] = useState<TournamentStatus>('upcoming');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRoomId, setEditRoomId] = useState('');
  const [editRoomPass, setEditRoomPass] = useState('');
  const [editError, setEditError] = useState('');

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);

  const filtered = tournaments.filter((t) => {
    const statusOk = statusFilter === 'ALL' ? true : t.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const searchOk =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.map.toLowerCase().includes(q) ||
      t.mode.toLowerCase().includes(q);
    return statusOk && searchOk;
  });

  async function handleOpenView(t: Tournament) {
    setViewTarget(t);
    setViewLoading(true);
    setViewJoins([]);
    setViewRoomId('');
    setViewRoomPass('');
    try {
      const details = await onFetchTournamentDetails(t.id);
      setViewJoins(details.joins);
      setViewRoomId(details.room?.roomId || '');
      setViewRoomPass(details.room?.roomPassword || '');
    } finally {
      setViewLoading(false);
    }
  }

  async function handleOpenEdit(t: Tournament) {
    setEditError('');
    setEditTarget(t);
    setEditName(t.name);
    setEditMode(normalizeTournamentMode(t.lobbyType || t.mode));
    setEditMatchType(
      t.matchType === 'Duo' || t.matchType === 'Squad' || t.matchType === 'Solo'
        ? t.matchType
        : 'Solo'
    );
    setEditVersion(t.version === 'FPP' ? 'FPP' : 'TPP');
    setEditMap(t.map);
    setEditEntry(Number(t.entryFee ?? 0) === 0 ? 'FREE' : String(t.entryFee ?? 0));
    setEditKill(String(t.perKillPrize ?? 0));
    setEditPrize(String(t.prizePool ?? 0));
    setEditSlots(String(t.slotsTotal ?? 48));
    const normStatus = String(t.status || 'upcoming').trim().toLowerCase();
    setEditStatus(
      normStatus === 'live' || normStatus === 'completed' || normStatus === 'cancelled'
        ? normStatus
        : 'upcoming'
    );
    setEditDate(t.matchDate || '');
    setEditTime(t.matchTime || '');
    setEditRoomId('');
    setEditRoomPass('');
    const details = await onFetchTournamentDetails(t.id);
    setEditRoomId(details.room?.roomId || '');
    setEditRoomPass(details.room?.roomPassword || '');
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError('');

    const cleanName = editName.trim().toUpperCase();
    if (cleanName.length < 3 || cleanName.length > 64) {
      setEditError('Tournament Title 3 se 64 characters ka hona chahiye.');
      return;
    }
    if (assignedLobby !== 'ALL' && !availableModes.includes(editMode)) {
      setEditError(`Mode "${editMode}" aapki assigned lobby (${getLobbyShortLabel(assignedLobby)}) ke bahar hai.`);
      return;
    }
    const trimmedEntry = editEntry.trim();
    const parsedEntry =
      !trimmedEntry || trimmedEntry.toUpperCase() === 'FREE' ? 0 : Number(trimmedEntry);
    if (!Number.isFinite(parsedEntry) || parsedEntry < 0) {
      setEditError('Entry Fee me valid number ya FREE daalein.');
      return;
    }

    const rawParsed = new Date(`${editDate} ${editTime}`).getTime();
    const parsedTs =
      Number.isFinite(rawParsed) && rawParsed > 0
        ? rawParsed
        : editTarget.matchTimestampMs && editTarget.matchTimestampMs > 0
        ? editTarget.matchTimestampMs
        : Date.now() + 3600000;

    const ok = await onSaveEdit({
      id: editTarget.id,
      name: cleanName,
      mode: editMode,
      matchType: editMatchType,
      version: editVersion,
      map: editMap,
      entryFee: Math.round(parsedEntry * 100) / 100,
      perKillPrize: Math.max(0, Number(editKill) || 0),
      prizePool: Math.max(0, Number(editPrize) || 0),
      slotsTotal: Math.floor(
        Math.max(
          Number(editTarget.slotsFilled || 0),
          Math.min(100, Math.max(2, Number(editSlots) || 48))
        )
      ),
      status: editStatus,
      matchDate: editDate.trim() || editTarget.matchDate,
      matchTime: editTime.trim() || editTarget.matchTime,
      matchTimestampMs: parsedTs,
      roomId: editRoomId.trim(),
      roomPassword: editRoomPass.trim(),
    });
    if (ok) setEditTarget(null);
  }

  function renderStatusBadge(s: TournamentStatus) {
    if (s === 'live') {
      return <span className="font-bold text-xs uppercase text-[#00C853]">Live</span>;
    }
    if (s === 'upcoming') {
      return <span className="font-bold text-xs uppercase text-[#FFC107]">Upcoming</span>;
    }
    if (s === 'completed') {
      return <span className="font-bold text-xs uppercase text-sky-400">Completed</span>;
    }
    return <span className="font-bold text-xs uppercase text-[#FF3B30]">Cancelled</span>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
            {assignedLobby === 'ALL'
              ? 'Manage Tournaments'
              : `Manage ${getLobbyShortLabel(assignedLobby)} Tournaments`}
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Track slot progress, update Room IDs, edit match details, or remove tournaments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('create-tournament')}
          className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/20 transition hover:bg-[#ff7f24]"
        >
          <Plus className="h-4 w-4 shrink-0" />
          New Tournament
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#12182B] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#0A0A0F] p-1">
          {(['ALL', 'live', 'upcoming', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`min-h-[38px] whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                statusFilter === tab
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? `All (${tournaments.length})` : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search match, map, mode..."
            className="min-h-[42px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] pr-4 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
          />
        </div>
      </div>

      {/* Table View */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12182B]">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-400">No tournaments match this filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0A0A0F]/60 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-5 py-3.5">Tournament Name</th>
                    <th className="px-5 py-3.5">Date &amp; Time</th>
                    <th className="px-5 py-3.5">Slots Filled</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {filtered.map((t) => {
                    const total = Math.max(1, Number(t.slotsTotal || 1));
                    const filled = Math.max(0, Number(t.slotsFilled || 0));
                    const pct = Math.min(100, Math.round((filled / total) * 100));
                    const isTimeOver =
                      (t.status === 'upcoming' || t.status === 'live') &&
                      Number(t.matchTimestampMs || 0) > 0 &&
                      Date.now() >= Number(t.matchTimestampMs);

                    return (
                      <tr key={t.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <div className="font-[family-name:var(--font-display)] font-bold text-white">
                            {t.name}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {t.matchType || 'Solo'} · {t.version || 'TPP'} · {t.map} · {normalizeTournamentMode(t.mode)} · Entry{' '}
                            <span className="font-mono font-bold text-slate-200">
                              {Number(t.entryFee || 0) === 0 ? 'FREE' : `₹${t.entryFee}`}
                            </span>{' '}
                            · Prize{' '}
                            <span className="font-mono font-bold text-[#FFC107]">₹{t.prizePool}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs font-medium text-slate-300">
                          <div className="font-mono font-bold text-white">{t.matchDate}</div>
                          <div className="text-slate-400">{t.matchTime}</div>
                          {isTimeOver && (
                            <div className="mt-0.5 text-[10px] font-bold text-[#FF8A80] uppercase">
                              Time Over · Lobby Se Hata
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 min-w-[190px]">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="font-mono font-bold tabular-nums text-white">
                              {filled}/{total}
                            </span>
                            <span className="font-mono text-slate-400 tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFC107]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {onChangeTournamentStatus ? (
                            <div className="flex flex-col gap-1.5">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={busyId === `status-${t.id}` || busyId === `toggle-${t.id}` || t.status === 'upcoming'}
                                  onClick={() => void onChangeTournamentStatus(t, 'upcoming')}
                                  className={`min-h-[28px] rounded-md px-2 text-[10px] font-bold uppercase transition ${
                                    t.status === 'upcoming'
                                      ? 'bg-[#FFC107] text-[#0A0A0F]'
                                      : 'border border-white/15 bg-[#0A0A0F] text-slate-300 hover:border-[#FFC107]/50 hover:text-[#FFC107]'
                                  }`}
                                >
                                  UPCOMING
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === `status-${t.id}` || busyId === `toggle-${t.id}` || t.status === 'live'}
                                  onClick={() => void onChangeTournamentStatus(t, 'live')}
                                  className={`min-h-[28px] rounded-md px-2 text-[10px] font-bold uppercase transition ${
                                    t.status === 'live'
                                      ? 'bg-[#00C853] text-[#04140A]'
                                      : 'border border-white/15 bg-[#0A0A0F] text-slate-300 hover:border-[#00C853]/50 hover:text-[#00C853]'
                                  }`}
                                >
                                  LIVE
                                </button>
                              </div>
                              <select
                                aria-label={`Status for ${t.name}`}
                                disabled={busyId === `status-${t.id}` || busyId === `toggle-${t.id}`}
                                value={String(t.status || 'upcoming').toLowerCase()}
                                onChange={(e) =>
                                  void onChangeTournamentStatus(t, e.target.value as TournamentStatus)
                                }
                                className={`min-h-[32px] rounded-lg border bg-[#0A0A0F] px-2 text-[11px] font-bold uppercase focus:border-[#FF6B00] focus:outline-none disabled:opacity-50 ${
                                  t.status === 'live'
                                    ? 'border-[#00C853]/45 text-[#00C853]'
                                    : t.status === 'upcoming'
                                    ? 'border-[#FFC107]/45 text-[#FFC107]'
                                    : t.status === 'completed'
                                    ? 'border-sky-400/45 text-sky-400'
                                    : 'border-[#FF3B30]/45 text-[#FF3B30]'
                                }`}
                              >
                                <option value="upcoming">UPCOMING</option>
                                <option value="live">LIVE</option>
                                <option value="completed">COMPLETED</option>
                                <option value="cancelled">CANCELLED</option>
                              </select>
                            </div>
                          ) : (
                            renderStatusBadge(t.status)
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {onToggleTournamentStatus && t.status !== 'completed' && (
                              <button
                                type="button"
                                disabled={busyId === `toggle-${t.id}`}
                                onClick={() => void onToggleTournamentStatus(t)}
                                className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                                  t.status === 'cancelled'
                                    ? 'border-[#FF3B30]/40 bg-[#FF3B30]/15 text-[#FF8A80] hover:bg-[#00C853]/20 hover:border-[#00C853]/40 hover:text-[#69F0AE]'
                                    : 'border-[#00C853]/40 bg-[#00C853]/15 text-[#69F0AE] hover:bg-[#FF3B30]/20 hover:border-[#FF3B30]/40 hover:text-[#FF8A80]'
                                }`}
                                title={t.status === 'cancelled' ? 'Turn Tournament ON' : 'Turn Tournament OFF'}
                              >
                                <Power className="h-3.5 w-3.5" />
                                {t.status === 'cancelled' ? 'OFF' : 'ON'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleOpenView(t)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/15"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleOpenEdit(t)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#FFC107]/40 bg-[#FFC107]/15 px-3 py-1.5 text-xs font-bold text-[#FFC107] transition hover:bg-[#FFC107] hover:text-[#0A0A0F]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(t)}
                              className="inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#FF3B30]/15 px-3 py-1.5 text-xs font-bold text-[#FF3B30] transition hover:bg-[#FF3B30] hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Rows */}
            <div className="divide-y divide-white/10 md:hidden">
              {filtered.map((t) => {
                const total = Math.max(1, Number(t.slotsTotal || 1));
                const filled = Math.max(0, Number(t.slotsFilled || 0));
                const pct = Math.min(100, Math.round((filled / total) * 100));
                const isTimeOver =
                  (t.status === 'upcoming' || t.status === 'live') &&
                  Number(t.matchTimestampMs || 0) > 0 &&
                  Date.now() >= Number(t.matchTimestampMs);

                return (
                  <div key={t.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-[family-name:var(--font-display)] text-sm font-bold text-white">
                          {t.name}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {t.matchType || 'Solo'} · {t.version || 'TPP'} · {t.map} · {t.matchDate} {t.matchTime}
                        </div>
                        {isTimeOver && (
                          <div className="mt-0.5 text-[10px] font-bold text-[#FF8A80] uppercase">
                            Time Over · Lobby Se Hata
                          </div>
                        )}
                      </div>
                      {onChangeTournamentStatus ? (
                        <select
                          aria-label={`Status for ${t.name}`}
                          disabled={busyId === `status-${t.id}` || busyId === `toggle-${t.id}`}
                          value={String(t.status || 'upcoming').toLowerCase()}
                          onChange={(e) =>
                            void onChangeTournamentStatus(t, e.target.value as TournamentStatus)
                          }
                          className={`min-h-[32px] rounded-lg border bg-[#0A0A0F] px-2 text-[11px] font-bold uppercase focus:border-[#FF6B00] focus:outline-none disabled:opacity-50 ${
                            t.status === 'live'
                              ? 'border-[#00C853]/45 text-[#00C853]'
                              : t.status === 'upcoming'
                              ? 'border-[#FFC107]/45 text-[#FFC107]'
                              : t.status === 'completed'
                              ? 'border-sky-400/45 text-sky-400'
                              : 'border-[#FF3B30]/45 text-[#FF3B30]'
                          }`}
                        >
                          <option value="upcoming">UPCOMING</option>
                          <option value="live">LIVE</option>
                          <option value="completed">COMPLETED</option>
                          <option value="cancelled">CANCELLED</option>
                        </select>
                      ) : (
                        renderStatusBadge(t.status)
                      )}
                    </div>

                    {onChangeTournamentStatus && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={busyId === `status-${t.id}` || busyId === `toggle-${t.id}` || t.status === 'upcoming'}
                          onClick={() => void onChangeTournamentStatus(t, 'upcoming')}
                          className={`min-h-[36px] rounded-xl text-xs font-bold uppercase transition ${
                            t.status === 'upcoming'
                              ? 'bg-[#FFC107] text-[#0A0A0F]'
                              : 'border border-white/15 bg-[#0A0A0F] text-slate-300'
                          }`}
                        >
                          UPCOMING
                        </button>
                        <button
                          type="button"
                          disabled={busyId === `status-${t.id}` || busyId === `toggle-${t.id}` || t.status === 'live'}
                          onClick={() => void onChangeTournamentStatus(t, 'live')}
                          className={`min-h-[36px] rounded-xl text-xs font-bold uppercase transition ${
                            t.status === 'live'
                              ? 'bg-[#00C853] text-[#04140A]'
                              : 'border border-white/15 bg-[#0A0A0F] text-slate-300'
                          }`}
                        >
                          LIVE
                        </button>
                      </div>
                    )}

                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-slate-400">Slots Filled</span>
                        <span className="font-mono font-bold text-white">
                          {filled}/{total} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFC107]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                      {onToggleTournamentStatus && t.status !== 'completed' && (
                        <button
                          type="button"
                          disabled={busyId === `toggle-${t.id}`}
                          onClick={() => void onToggleTournamentStatus(t)}
                          className={`inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border text-xs font-bold disabled:opacity-50 ${
                            t.status === 'cancelled'
                              ? 'border-[#FF3B30]/40 bg-[#FF3B30]/15 text-[#FF8A80]'
                              : 'border-[#00C853]/40 bg-[#00C853]/15 text-[#69F0AE]'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {t.status === 'cancelled' ? 'Turn ON' : 'ON'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleOpenView(t)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/5 text-xs font-bold text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOpenEdit(t)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#FFC107]/15 text-xs font-bold text-[#FFC107]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#FF3B30]/15 text-xs font-bold text-[#FF3B30]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* VIEW MODAL (Room ID + Joined Players) */}
      {viewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewTarget(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/15 bg-[#12182B] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                  {viewTarget.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {normalizeTournamentMode(viewTarget.mode)} · {viewTarget.map} · {viewTarget.matchDate} {viewTarget.matchTime} · Entry ₹{viewTarget.entryFee} · Prize ₹{viewTarget.prizePool}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Room Credentials Quick Update */}
            <div className="mt-5 rounded-xl border border-white/10 bg-[#0A0A0F]/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-[#FFC107] uppercase">
                <KeyRound className="h-4 w-4" />
                Room ID &amp; Password (Instant delivery to joined players)
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  value={viewRoomId}
                  onChange={(e) => setViewRoomId(e.target.value)}
                  placeholder="Room ID"
                  className="min-h-[42px] rounded-xl border border-white/15 bg-[#12182B] px-3 font-mono text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
                />
                <input
                  type="text"
                  value={viewRoomPass}
                  onChange={(e) => setViewRoomPass(e.target.value)}
                  placeholder="Password"
                  className="min-h-[42px] rounded-xl border border-white/15 bg-[#12182B] px-3 font-mono text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={busyId === `room-${viewTarget.id}`}
                  onClick={() => void onSaveRoomOnly(viewTarget.id, viewRoomId, viewRoomPass)}
                  className="min-h-[42px] rounded-xl bg-[#FF6B00] px-4 text-xs font-bold text-white transition hover:bg-[#ff7f24] disabled:opacity-50"
                >
                  Save Room ID
                </button>
              </div>
            </div>

            {/* Joined Players */}
            <div className="mt-5">
              <h4 className="mb-3 text-xs font-bold tracking-wider text-slate-300 uppercase">
                Joined Players ({viewJoins.length})
              </h4>
              {viewLoading ? (
                <RosterTableSkeleton rows={5} />
              ) : viewJoins.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-[#0A0A0F]/50 p-4 text-center text-xs text-slate-400">
                  No players have joined this tournament yet.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0A0A0F]/60">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-slate-400 uppercase">
                      <tr>
                        <th className="px-3 py-2.5">Slot</th>
                        <th className="px-3 py-2.5">Player</th>
                        <th className="px-3 py-2.5">FF UID</th>
                        <th className="px-3 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {viewJoins.map((j) => (
                        <tr key={j.id}>
                          <td className="px-3 py-2 font-mono font-bold text-[#FFC107]">#{j.slotNumber}</td>
                          <td className="px-3 py-2 font-semibold text-white">{j.userName}</td>
                          <td className="px-3 py-2 font-mono text-slate-300">{j.ffUid}</td>
                          <td className="px-3 py-2 text-right font-bold uppercase text-[#00C853]">
                            {j.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditTarget(null);
          }}
        >
          <form
            onSubmit={(e) => void submitEdit(e)}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#12182B] p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
                Edit Tournament
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Title</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Lobby Category</label>
                <select
                  value={editMode}
                  onChange={(e) => setEditMode(e.target.value as TournamentMode)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
                >
                  {availableModes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  {!availableModes.includes(editMode) && (
                    <option value={editMode}>{editMode}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Match Type *</label>
                <select
                  required
                  value={editMatchType}
                  onChange={(e) => setEditMatchType(e.target.value as TournamentMatchType)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
                >
                  {MATCH_TYPES.map((mt) => (
                    <option key={mt} value={mt}>
                      {mt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Version</label>
                <select
                  value={editVersion}
                  onChange={(e) => setEditVersion(e.target.value as TournamentVersion)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
                >
                  {TOURNAMENT_VERSIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Map</label>
                <select
                  value={editMap}
                  onChange={(e) => setEditMap(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
                >
                  {TOURNAMENT_MAPS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Entry Fee (₹ / FREE)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editEntry}
                  onChange={(e) => setEditEntry(e.target.value)}
                  placeholder="0 or FREE"
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Per Kill (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={editKill}
                  onChange={(e) => setEditKill(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Prize Pool (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={editPrize}
                  onChange={(e) => setEditPrize(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-[#FFC107]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Total Slots</label>
                <input
                  type="number"
                  min={Math.max(2, editTarget.slotsFilled || 0)}
                  max={100}
                  value={editSlots}
                  onChange={(e) => setEditSlots(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Match Date</label>
                <input
                  type="text"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Match Time</label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Status (UPCOMING / LIVE / COMPLETED / CANCELLED)
                  </label>
                  <span className="text-[11px] font-semibold text-[#00C853]">
                    Unlocked
                  </span>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Tournament Status"
                  className="grid grid-cols-2 gap-2 rounded-xl border border-white/15 bg-[#0A0A0F] p-2 sm:grid-cols-4"
                >
                  {(
                    [
                      { value: 'upcoming', label: 'UPCOMING', activeClass: 'bg-[#FFC107] text-[#0A0A0F]' },
                      { value: 'live', label: 'LIVE', activeClass: 'bg-[#00C853] text-[#04140A]' },
                      { value: 'completed', label: 'COMPLETED', activeClass: 'bg-sky-400 text-[#05121E]' },
                      { value: 'cancelled', label: 'CANCELLED', activeClass: 'bg-[#FF3B30] text-white' },
                    ] as const
                  ).map((opt) => {
                    const selected = editStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setEditStatus(opt.value)}
                        className={`min-h-[42px] rounded-lg px-2 text-xs font-bold uppercase transition ${
                          selected
                            ? `${opt.activeClass} shadow-md`
                            : 'bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Room ID</label>
                <input
                  type="text"
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  placeholder="Optional"
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">Room Password</label>
                <input
                  type="text"
                  value={editRoomPass}
                  onChange={(e) => setEditRoomPass(e.target.value)}
                  placeholder="Optional"
                  className="min-h-[44px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-5 text-xs font-bold text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === `edit-${editTarget.id}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#FF6B00] px-5 text-xs font-bold text-white"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE / REFUND MODAL */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#FF3B30]/40 bg-[#12182B] p-6">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white">
              Remove Tournament?
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              <strong className="text-white">{deleteTarget.name}</strong> currently has{' '}
              <span className="font-mono font-bold text-[#FFC107]">{deleteTarget.slotsFilled}</span> filled slot(s).
              If players paid entry fees, refund all first before deleting.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              {deleteTarget.status !== 'cancelled' && deleteTarget.status !== 'completed' && (
                <button
                  type="button"
                  disabled={busyId === `refund-${deleteTarget.id}`}
                  onClick={async () => {
                    await onCancelAndRefundAll(deleteTarget);
                    setDeleteTarget(null);
                  }}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFC107] px-4 text-xs font-bold text-[#0A0A0F]"
                >
                  <RotateCcw className="h-4 w-4" />
                  Cancel &amp; Auto-Refund All Players
                </button>
              )}
              <button
                type="button"
                disabled={busyId === `del-${deleteTarget.id}`}
                onClick={async () => {
                  await onDeleteTournament(deleteTarget);
                  setDeleteTarget(null);
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#FF3B30] px-4 text-xs font-bold text-white"
              >
                <Trash2 className="h-4 w-4" />
                Delete Tournament Document
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[42px] w-full rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200"
              >
                Keep Tournament
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
