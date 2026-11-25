import React, { useEffect, useState } from 'react';
import { CalendarClock, KeyRound, Lock, MapPin, Rocket, Trophy } from 'lucide-react';
import {
  getLobbyAllowedModes,
  getLobbyShortLabel,
  LOBBY_CONFIG,
  type AssignedLobby,
  type TournamentMode,
  type TournamentStatus,
} from '../types';

export interface CreateTournamentPayload {
  name: string;
  dateTimeLocal: string;
  map: string;
  mode: TournamentMode;
  entryFee: number;
  perKillPrize: number;
  winnerPrize: number;
  slotsTotal: number;
  roomId: string;
  roomPassword: string;
  status: TournamentStatus;
}

interface CreateTournamentScreenProps {
  assignedLobby: AssignedLobby;
  onPublish: (payload: CreateTournamentPayload) => Promise<boolean>;
  isSubmitting: boolean;
}

function getDefaultDateTimeLocal(): string {
  const d = new Date(Date.now() + 2 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const CreateTournamentScreen: React.FC<CreateTournamentScreenProps> = ({
  assignedLobby,
  onPublish,
  isSubmitting,
}) => {
  const availableModes = getLobbyAllowedModes(assignedLobby);
  const defaultMode: TournamentMode =
    assignedLobby === 'all' ? 'FULL MAP' : LOBBY_CONFIG[assignedLobby].defaultMode;
  const defaultSlots =
    assignedLobby === 'all' ? '48' : LOBBY_CONFIG[assignedLobby].defaultSlots;

  const [title, setTitle] = useState('');
  const [dateTimeLocal, setDateTimeLocal] = useState<string>(getDefaultDateTimeLocal);
  const [map, setMap] = useState('Bermuda');
  const [mode, setMode] = useState<TournamentMode>(defaultMode);
  const [entryFee, setEntryFee] = useState('20');
  const [perKillPrize, setPerKillPrize] = useState('15');
  const [winnerPrize, setWinnerPrize] = useState('500');
  const [slotsTotal, setSlotsTotal] = useState(defaultSlots);
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [status, setStatus] = useState<TournamentStatus>('upcoming');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!availableModes.includes(mode)) {
      setMode(defaultMode);
      setSlotsTotal(defaultSlots);
    }
  }, [assignedLobby, availableModes, defaultMode, defaultSlots, mode]);

  function handleSelectMode(m: TournamentMode) {
    setMode(m);
    if (m === 'FULL MAP' || m === 'SURVIVAL' || m === 'SQUAD' || m === 'SOLO') setSlotsTotal('48');
    else if (m === 'DUO') setSlotsTotal('24');
    else if (m === 'CS 2VS2' || m === 'LW 2VS2') setSlotsTotal('4');
    else if (m === '4V4 LOBBY') setSlotsTotal('8');
    else if (m === 'CUSTOM') setSlotsTotal('12');
    else setSlotsTotal('2');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 64) {
      setFormError('Tournament Title must be 3 to 64 characters.');
      return;
    }
    if (!dateTimeLocal) {
      setFormError('Please select a valid Match Date & Time.');
      return;
    }
    if (!availableModes.includes(mode)) {
      setFormError(`Mode "${mode}" aapki assigned lobby (${getLobbyShortLabel(assignedLobby)}) ke bahar hai.`);
      return;
    }
    const slots = Math.floor(Number(slotsTotal));
    if (!Number.isFinite(slots) || slots < 2 || slots > 100) {
      setFormError('Total Slots must be between 2 and 100.');
      return;
    }

    const ok = await onPublish({
      name: trimmedTitle.toUpperCase(),
      dateTimeLocal,
      map,
      mode,
      entryFee: Math.max(0, Number(entryFee) || 0),
      perKillPrize: Math.max(0, Number(perKillPrize) || 0),
      winnerPrize: Math.max(0, Number(winnerPrize) || 0),
      slotsTotal: slots,
      roomId: roomId.trim(),
      roomPassword: roomPassword.trim(),
      status,
    });

    if (ok) {
      setTitle('');
      setRoomId('');
      setRoomPassword('');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
            Create Tournament
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Configure match rules, prizes, slots, and optional Room ID credentials in one screen.
          </p>
        </div>
        {assignedLobby !== 'all' && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#FFC107]/40 bg-[#FFC107]/10 px-3.5 py-2 text-xs font-bold text-[#FFC107]">
            <Lock className="h-3.5 w-3.5" />
            {getLobbyShortLabel(assignedLobby)} LOBBY ACCESS ONLY
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-7"
      >
        {formError && (
          <div className="mb-5 rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-sm font-semibold text-[#FF8A80]">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2">
            <label htmlFor="create-title" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Tournament Title
            </label>
            <input
              id="create-title"
              type="text"
              maxLength={64}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. BERMUDA PRO CUP #42"
              className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
            />
          </div>

          {/* Date Time */}
          <div>
            <label htmlFor="create-datetime" className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <CalendarClock className="h-3.5 w-3.5 text-[#FF6B00]" />
              Date &amp; Time
            </label>
            <input
              id="create-datetime"
              type="datetime-local"
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
            />
          </div>

          {/* Map */}
          <div>
            <label htmlFor="create-map" className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <MapPin className="h-3.5 w-3.5 text-[#FF6B00]" />
              Map
            </label>
            <select
              id="create-map"
              value={map}
              onChange={(e) => setMap(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-semibold text-white focus:border-[#FF6B00] focus:outline-none"
            >
              <option value="Bermuda">Bermuda</option>
              <option value="Purgatory">Purgatory</option>
              <option value="Craftland">Craftland</option>
            </select>
          </div>

          {/* Mode Selector */}
          <div className="md:col-span-2">
            <label htmlFor="create-mode" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Mode / Lobby Type {assignedLobby !== 'all' ? `(${getLobbyShortLabel(assignedLobby)} Only)` : ''}
            </label>
            <select
              id="create-mode"
              value={mode}
              onChange={(e) => handleSelectMode(e.target.value as TournamentMode)}
              className="mb-2.5 min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
            >
              {availableModes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/15 bg-[#0A0A0F] p-1.5">
              {availableModes.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMode(m)}
                  className={`min-h-[40px] rounded-lg px-2 text-xs font-bold whitespace-nowrap transition ${
                    mode === m
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <span className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Initial Status
            </span>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-white/15 bg-[#0A0A0F] p-1.5">
              <button
                type="button"
                onClick={() => setStatus('upcoming')}
                className={`min-h-[38px] rounded-lg px-3 text-xs font-bold transition ${
                  status === 'upcoming' ? 'bg-[#FFC107] text-[#0A0A0F]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setStatus('live')}
                className={`min-h-[38px] rounded-lg px-3 text-xs font-bold transition ${
                  status === 'live' ? 'bg-[#00C853] text-[#05180B]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Now
              </button>
            </div>
          </div>

          {/* Prize & Fee Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:col-span-2">
            <div>
              <label htmlFor="create-entry" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
                Entry Fee (₹)
              </label>
              <input
                id="create-entry"
                type="number"
                min={0}
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-base font-bold tabular-nums text-white focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="create-perkill" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
                Per Kill Prize (₹)
              </label>
              <input
                id="create-perkill"
                type="number"
                min={0}
                value={perKillPrize}
                onChange={(e) => setPerKillPrize(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-base font-bold tabular-nums text-[#00C853] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="create-winner-prize" className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
                <Trophy className="h-3.5 w-3.5 text-[#FFC107]" />
                Winner Prize (₹)
              </label>
              <input
                id="create-winner-prize"
                type="number"
                min={0}
                value={winnerPrize}
                onChange={(e) => setWinnerPrize(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-base font-bold tabular-nums text-[#FFC107] focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
          </div>

          {/* Total Slots */}
          <div className="md:col-span-2">
            <label htmlFor="create-slots" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Total Slots (Quick Select 2 / 4 / 8 / 12 / 24 / 48 or Custom)
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {['2', '4', '8', '12', '24', '48'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSlotsTotal(preset)}
                  className={`min-h-[46px] min-w-[74px] rounded-xl border px-4 font-mono text-sm font-bold transition ${
                    slotsTotal === preset
                      ? 'border-[#FF6B00] bg-[#FF6B00]/20 text-white'
                      : 'border-white/15 bg-[#0A0A0F] text-slate-300 hover:border-white/30'
                  }`}
                >
                  {preset} Slots
                </button>
              ))}
              <input
                id="create-slots"
                type="number"
                min={2}
                max={100}
                value={slotsTotal}
                onChange={(e) => setSlotsTotal(e.target.value)}
                className="min-h-[46px] w-32 rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-base font-bold tabular-nums text-white focus:border-[#FF6B00] focus:outline-none"
              />
            </div>
          </div>

          {/* Room ID & Password */}
          <div>
            <label htmlFor="create-room-id" className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <KeyRound className="h-3.5 w-3.5 text-[#FFC107]" />
              Room ID (Optional)
            </label>
            <input
              id="create-room-id"
              type="text"
              maxLength={32}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. 84920145"
              className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="create-room-pass" className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <KeyRound className="h-3.5 w-3.5 text-[#FFC107]" />
              Room Password (Optional)
            </label>
            <input
              id="create-room-pass"
              type="text"
              maxLength={32}
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              placeholder="e.g. FF779"
              className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
            />
          </div>
        </div>

        {/* Big Orange Publish Button */}
        <div className="mt-7 border-t border-white/10 pt-5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#FF6B00] px-6 py-3 font-[family-name:var(--font-display)] text-base font-bold tracking-wide text-white shadow-xl shadow-[#FF6B00]/30 transition hover:bg-[#ff7f24] disabled:opacity-50"
          >
            <Rocket className="h-5 w-5" />
            {isSubmitting ? 'Publishing Tournament...' : 'Publish Tournament'}
          </button>
        </div>
      </form>
    </div>
  );
};
