import React, { useState } from 'react';
import {
  Activity,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit2,
  History,
  ImagePlus,
  Lock,
  Phone,
  Power,
  ShieldCheck,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  ADMIN_LOBBIES,
  getManagerLobbiesList,
  isModeInLobby,
  sanitizeMobileDigits,
  type AdminAccountRecord,
  type AdminActivityLog,
  type Tournament,
  type TournamentJoin,
  type TournamentMode,
} from '../types';
import { compressImageToDataUrl, formatTimestamp } from '../firebase';
import type { DistributePrizeEntry, DistributePrizePayload } from './ResultsPrizeScreen';

export interface CreateManagerPayload {
  name: string;
  mobile: string;
  password: string;
  assigned_lobbies: TournamentMode[];
}

interface ManageManagersScreenProps {
  managers: AdminAccountRecord[];
  tournaments?: Tournament[];
  onLoadJoins?: (tournamentId: string) => Promise<TournamentJoin[]>;
  onDistributePrize?: (payload: DistributePrizePayload) => Promise<boolean>;
  isDistributing?: boolean;
  onCreateManager: (payload: CreateManagerPayload) => Promise<boolean>;
  onUpdateManager?: (managerId: string, payload: { name: string; assigned_lobbies: TournamentMode[] }) => Promise<boolean>;
  onToggleManagerActive: (manager: AdminAccountRecord) => Promise<void>;
  onDeleteManager: (manager: AdminAccountRecord) => Promise<void>;
  busyId: string | null;
}

function lobbyAccent(lobby: string): string {
  if (lobby === 'FULL MAP' || lobby === 'SURVIVAL') {
    return 'border-[#00C853]/40 bg-[#00C853]/12 text-[#69F0AE]';
  }
  if (lobby === 'CS LOBBY' || lobby === 'CS ONE TAP') {
    return 'border-[#FFC107]/40 bg-[#FFC107]/12 text-[#FFC107]';
  }
  if (lobby === 'LW LOBBY' || lobby === 'LW ONE TAP') {
    return 'border-sky-400/40 bg-sky-400/12 text-sky-300';
  }
  if (lobby === 'SNIPER LOBBY' || lobby === '1VS1 HIGH') {
    return 'border-purple-400/40 bg-purple-400/12 text-purple-300';
  }
  if (lobby === 'FREE') {
    return 'border-[#FF6B00]/40 bg-[#FF6B00]/12 text-[#FF9E5E]';
  }
  return 'border-white/20 bg-white/10 text-slate-200';
}

export const ManageManagersScreen: React.FC<ManageManagersScreenProps> = ({
  managers,
  tournaments = [],
  onLoadJoins,
  onDistributePrize,
  isDistributing = false,
  onCreateManager,
  onUpdateManager,
  onToggleManagerActive,
  onDeleteManager,
  busyId,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingManager, setEditingManager] = useState<AdminAccountRecord | null>(null);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLobbies, setSelectedLobbies] = useState<TournamentMode[]>(['FULL MAP']);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Manager Report Modal State (Super Admin Only)
  const [reportManager, setReportManager] = useState<AdminAccountRecord | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportJoinsMap, setReportJoinsMap] = useState<Record<string, TournamentJoin[]>>({});
  const [prizeTargetId, setPrizeTargetId] = useState<string | null>(null);
  const [prizeWinnerId, setPrizeWinnerId] = useState<string>('');
  const [prizeKillsMap, setPrizeKillsMap] = useState<Record<string, number>>({});
  const [prizeWinnerBonus, setPrizeWinnerBonus] = useState<string>('0');
  const [prizeScreenshot, setPrizeScreenshot] = useState<string>('');
  const [prizeError, setPrizeError] = useState<string>('');

  const lobbyManagers = managers.filter((m) => m.role === 'lobby_manager' || m.role === 'manager');

  function getMatchesForManager(m: AdminAccountRecord): Tournament[] {
    const mLobbies = getManagerLobbiesList(m);
    return tournaments.filter(
      (t) =>
        t.createdByUid === m.uid ||
        (mLobbies.length > 0 && isModeInLobby(t.lobbyType || t.mode, mLobbies))
    );
  }

  async function handleOpenReport(m: AdminAccountRecord) {
    setReportManager(m);
    setPrizeTargetId(null);
    setPrizeError('');
    setPrizeScreenshot('');
    const matched = getMatchesForManager(m);
    if (!onLoadJoins || matched.length === 0) {
      setReportJoinsMap({});
      setReportLoading(false);
      return;
    }
    setReportLoading(true);
    try {
      const entries = await Promise.all(
        matched.map(async (t) => {
          try {
            const list = await onLoadJoins(t.id);
            return [t.id, list.filter((j) => j.status !== 'refunded')] as const;
          } catch {
            return [t.id, [] as TournamentJoin[]] as const;
          }
        })
      );
      setReportJoinsMap(Object.fromEntries(entries));
    } finally {
      setReportLoading(false);
    }
  }

  function handleOpenInlinePrize(t: Tournament, joins: TournamentJoin[]) {
    setPrizeTargetId(t.id);
    setPrizeError('');
    setPrizeScreenshot('');
    setPrizeWinnerBonus(String(t.prizePool ?? 0));
    if (joins.length > 0) {
      setPrizeWinnerId(joins[0].userId);
      const nextKills: Record<string, number> = {};
      joins.forEach((j) => {
        nextKills[j.userId] = Number(j.kills || 0);
      });
      setPrizeKillsMap(nextKills);
    } else {
      setPrizeWinnerId('');
      setPrizeKillsMap({});
    }
  }

  async function handleReportScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrizeError('');
    try {
      const compressed = await compressImageToDataUrl(file, 900, 185000);
      setPrizeScreenshot(compressed);
    } catch (err) {
      setPrizeError(err instanceof Error ? err.message : 'Failed to process screenshot.');
    }
  }

  async function handleSubmitInlinePrize(t: Tournament, joins: TournamentJoin[]) {
    if (!onDistributePrize) return;
    setPrizeError('');
    if (joins.length === 0) {
      setPrizeError('Is match me abhi koi joined player nahi hai.');
      return;
    }
    if (!prizeWinnerId) {
      setPrizeError('Please select a Booyah Winner.');
      return;
    }
    const perKillRate = Number(t.perKillPrize || 0);
    const bonusAmount = Math.max(0, Number(prizeWinnerBonus) || 0);
    const entries: DistributePrizeEntry[] = joins.map((join) => {
      const kills = Math.max(0, Math.floor(Number(prizeKillsMap[join.userId] ?? 0)));
      const isWinner = join.userId === prizeWinnerId;
      const killPrize = kills * perKillRate;
      const winBonus = isWinner ? bonusAmount : 0;
      return {
        join,
        kills,
        isWinner,
        killPrize,
        winBonus,
        totalPrize: killPrize + winBonus,
      };
    });

    const ok = await onDistributePrize({
      tournament: t,
      winnerBonus: bonusAmount,
      screenshotDataUrl: prizeScreenshot,
      entries,
    });

    if (ok) {
      setPrizeTargetId(null);
      setPrizeScreenshot('');
      if (onLoadJoins) {
        const refreshed = await onLoadJoins(t.id).catch(() => joins);
        setReportJoinsMap((prev) => ({
          ...prev,
          [t.id]: refreshed.filter((j) => j.status !== 'refunded'),
        }));
      }
    }
  }

  // Compute set of lobbies assigned to OTHER managers
  const assignedLobbiesByOthers = new Set<string>();
  lobbyManagers.forEach((m) => {
    if (editingManager && m.id === editingManager.id) return;
    getManagerLobbiesList(m).forEach((l) => assignedLobbiesByOthers.add(String(l).trim().toUpperCase()));
  });

  function handleToggleLobbyChip(lobby: TournamentMode) {
    if (assignedLobbiesByOthers.has(lobby)) return; // already assigned to another manager
    setSelectedLobbies((prev) => {
      if (prev.includes(lobby)) {
        return prev.filter((l) => l !== lobby);
      } else {
        return [...prev, lobby];
      }
    });
  }

  function startCreate() {
    if (lobbyManagers.length >= 3) {
      setFormError('Only 3 Managers Allowed. Delete an existing manager to add new one.');
      setShowAddForm(true);
      return;
    }
    setEditingManager(null);
    setName('');
    setMobile('');
    setPassword('');
    setSelectedLobbies([]);
    setFormError('');
    setShowAddForm(true);
  }

  function startEdit(m: AdminAccountRecord) {
    setEditingManager(m);
    setName(m.name || '');
    setMobile(m.mobile || '');
    setPassword('');
    setSelectedLobbies(getManagerLobbiesList(m));
    setFormError('');
    setShowAddForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 48) {
      setFormError('Manager ka naam 2 se 48 characters ka hona chahiye.');
      return;
    }

    if (!editingManager) {
      if (lobbyManagers.length >= 3) {
        setFormError('Only 3 Managers Allowed. Delete an existing manager to add new one.');
        return;
      }
      const digits = sanitizeMobileDigits(mobile);
      if (digits.length < 10 || digits.length > 15) {
        setFormError('Valid 10-digit Mobile Number daalein.');
        return;
      }
      if (password.length < 6) {
        setFormError('Password kam se kam 6 characters ka hona chahiye.');
        return;
      }
      if (selectedLobbies.length === 0) {
        setFormError('Select at least 1 Lobby.');
        return;
      }

      const ok = await onCreateManager({
        name: cleanName,
        mobile: digits,
        password,
        assigned_lobbies: selectedLobbies,
      });
      if (ok) {
        setShowAddForm(false);
      }
    } else {
      if (selectedLobbies.length === 0) {
        setFormError('Select at least 1 Lobby.');
        return;
      }
      if (onUpdateManager) {
        const ok = await onUpdateManager(editingManager.id, {
          name: cleanName,
          assigned_lobbies: selectedLobbies,
        });
        if (ok) {
          setShowAddForm(false);
          setEditingManager(null);
        }
      }
    }
  }

  // 3 Fixed Slots Roster
  const slots = [0, 1, 2];

  return (
    <div className="space-y-6">
      {/* Header with Counter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
              Lobby Managers
            </h2>
            <span className="rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/15 px-3 py-1 font-mono text-xs font-bold text-[#FF9E5E]">
              Managers: {lobbyManagers.length}/3
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">
            Max 3 managers allowed. Assign multi-select lobbies (FULL MAP, CS LOBBY, etc.) securely.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showAddForm) {
              setShowAddForm(false);
            } else {
              startCreate();
            }
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24]"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showAddForm ? 'Close Form' : 'Add Manager'}
        </button>
      </div>

      {/* Add / Edit Manager Form */}
      {showAddForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-[#FF6B00]/40 bg-[#12182B] p-5 shadow-xl sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#FF6B00]" />
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                {editingManager ? `Edit Manager: ${editingManager.name}` : 'Create New Lobby Manager'}
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {editingManager ? 'Update Name & Lobbies' : 'Mobile + Password Login'}
            </span>
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="mgr-name" className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">
                Manager Naam
              </label>
              <input
                id="mgr-name"
                type="text"
                maxLength={48}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul"
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
              />
            </div>

            {!editingManager && (
              <>
                <div>
                  <label htmlFor="mgr-mobile" className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">
                    Mobile Number
                  </label>
                  <input
                    id="mgr-mobile"
                    type="tel"
                    maxLength={15}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 font-mono text-sm font-bold text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="mgr-password" className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">
                    Password (Min 6 chars)
                  </label>
                  <input
                    id="mgr-password"
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter login password"
                    className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase">
                  ASSIGN LOBBY (SELECT MULTIPLE)
                </span>
                <span className="text-[11px] font-semibold text-[#FF9E5E]">
                  Selected: {selectedLobbies.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-white/15 bg-[#0A0A0F] p-3">
                {ADMIN_LOBBIES.map((lobby) => {
                  const isAssignedElse = assignedLobbiesByOthers.has(lobby);
                  const isSelected = selectedLobbies.includes(lobby);

                  if (isAssignedElse) {
                    return (
                      <div
                        key={lobby}
                        className="flex min-h-[42px] cursor-not-allowed items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs font-bold text-slate-500 opacity-60"
                      >
                        <span className="truncate">{lobby}</span>
                        <span className="text-[10px] text-slate-600">Already Assigned</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={lobby}
                      type="button"
                      onClick={() => handleToggleLobbyChip(lobby)}
                      className={`flex min-h-[42px] items-center justify-between rounded-lg border px-3 text-xs font-bold transition ${
                        isSelected
                          ? 'border-[#FF6B00] bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                          : 'border-white/15 bg-[#12182B] text-slate-300 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{lobby}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingManager(null);
              }}
              className="min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-5 text-xs font-bold text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busyId === 'create-manager'}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#FF6B00] px-6 text-xs font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24] disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {busyId === 'create-manager'
                ? 'Saving...'
                : editingManager
                ? 'Update Manager'
                : 'Save & Activate Manager'}
            </button>
          </div>
        </form>
      )}

      {/* 3 Fixed Slots Roster UI */}
      <div>
        <div className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
          Manager Slots (Max 3)
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {slots.map((idx) => {
            const m = lobbyManagers[idx];
            if (!m) {
              return (
                <div
                  key={`empty-${idx}`}
                  onClick={startCreate}
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#12182B]/50 p-6 text-center transition hover:border-[#FF6B00] hover:bg-[#12182B] cursor-pointer min-h-[180px]"
                >
                  <UserPlus className="mb-2 h-8 w-8 text-slate-500" />
                  <div className="text-sm font-bold text-white">Empty Slot - Add Manager</div>
                  <div className="mt-1 text-xs text-slate-400">Slot {idx + 1} of 3</div>
                </div>
              );
            }

            const isOn = m.is_active !== false && m.isActive !== false;
            const lobbies = getManagerLobbiesList(m);
            const busy = busyId === `mgr-${m.id}`;
            const managerMatchCount = getMatchesForManager(m).length;

            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                onClick={() => void handleOpenReport(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleOpenReport(m);
                  }
                }}
                className="flex cursor-pointer flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 shadow-lg transition hover:border-[#FF6B00]/60 hover:bg-[#161E35]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-[#FF6B00]">SLOT {idx + 1}</div>
                      <h4 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                        {m.name || 'Manager'}
                      </h4>
                      <div className="mt-0.5 font-mono text-xs text-slate-300">
                        {m.mobile || m.email}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase ${
                        isOn ? 'bg-[#00C853]/15 text-[#69F0AE]' : 'bg-[#FF3B30]/15 text-[#FF8A80]'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isOn ? 'bg-[#00C853]' : 'bg-[#FF3B30]'}`} />
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  {/* Assigned Lobbies Chips */}
                  <div className="mt-3">
                    <div className="mb-1 text-[11px] font-semibold text-slate-400 uppercase">
                      Assigned Lobbies:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lobbies.map((l) => (
                        <span
                          key={l}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${lobbyAccent(l)}`}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#0A0A0F]/60 px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-300">
                      Matches: <strong className="font-mono text-white">{managerMatchCount}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-[#FFC107]">
                      Tap for Report
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                <div
                  className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onToggleManagerActive(m)}
                    className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50 ${
                      isOn
                        ? 'border border-[#FF3B30]/40 bg-[#FF3B30]/15 text-[#FF8A80] hover:bg-[#FF3B30] hover:text-white'
                        : 'border border-[#00C853]/40 bg-[#00C853]/15 text-[#69F0AE] hover:bg-[#00C853] hover:text-[#04140A]'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {isOn ? 'Turn OFF' : 'Turn ON'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startEdit(m)}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-white hover:bg-white/15"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    {confirmDeleteId === m.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            await onDeleteManager(m);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[36px] rounded-lg bg-[#FF3B30] px-2 text-xs font-bold text-white"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[36px] rounded-lg border border-white/15 bg-white/5 px-2 text-xs font-bold text-slate-300"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDeleteId(m.id)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-slate-300 hover:border-[#FF3B30]/50 hover:text-[#FF8A80]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Super Admin Info Box */}
      <div className="rounded-2xl border border-white/10 bg-[#12182B]/70 p-4 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-bold text-white">
          <Lock className="h-4 w-4 text-[#FFC107]" />
          Security &amp; Lobby Isolation Active
        </div>
        <p className="mt-1 text-slate-400">
          Lobby Managers can only manage tournaments in their assigned multi-select lobbies. Kisi bhi Manager card par tap karke uske saare matches, joined players list aur Prize / Price distribution Super Admin kar sakte hain.
        </p>
      </div>

      {/* MANAGER REPORT MODAL (SUPER ADMIN ONLY) */}
      {reportManager && (() => {
        const reportLobbies = getManagerLobbiesList(reportManager);
        const reportMatches = getMatchesForManager(reportManager);
        const isReportMgrOn = reportManager.is_active !== false && reportManager.isActive !== false;
        const totalJoinedAcrossMatches = reportMatches.reduce(
          (sum, t) => sum + (reportJoinsMap[t.id]?.length ?? Number(t.slotsFilled || 0)),
          0
        );
        const completedMatchesCount = reportMatches.filter((t) => t.status === 'completed').length;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
            onClick={(e) => {
              if (e.target === e.currentTarget) setReportManager(null);
            }}
          >
            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/15 bg-[#12182B] p-5 shadow-2xl sm:p-6">
              {/* Modal Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white sm:text-xl">
                      Manager Report — {reportManager.name || 'Manager'}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                        isReportMgrOn
                          ? 'bg-[#00C853]/15 text-[#69F0AE]'
                          : 'bg-[#FF3B30]/15 text-[#FF8A80]'
                      }`}
                    >
                      {isReportMgrOn ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Phone className="h-3.5 w-3.5 text-[#FF6B00]" />
                      {reportManager.mobile || reportManager.email}
                    </span>
                    <span className="text-slate-500">·</span>
                    <div className="flex flex-wrap gap-1">
                      {reportLobbies.map((l) => (
                        <span
                          key={l}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${lobbyAccent(l)}`}
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReportManager(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-slate-300 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Report Summary Stats */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#0A0A0F]/70 p-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Matches</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-white">{reportMatches.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0A0A0F]/70 p-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Players Joined</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#FFC107]">
                    {totalJoinedAcrossMatches}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0A0A0F]/70 p-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Completed</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-[#00C853]">
                    {completedMatchesCount}
                  </div>
                </div>
              </div>

              {/* Matches + Joined Players + Super Admin Prize Distribution */}
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-300 uppercase">
                    <Trophy className="h-4 w-4 text-[#FF6B00]" />
                    Conducted Matches &amp; Joined Players ({reportMatches.length})
                  </h4>
                  <span className="text-[11px] font-semibold text-[#FFC107]">
                    Prize / Price Control: Super Admin Only
                  </span>
                </div>

                {reportLoading ? (
                  <div className="rounded-xl border border-white/10 bg-[#0A0A0F]/60 p-8 text-center text-sm text-slate-400">
                    Loading matches and joined players list...
                  </div>
                ) : reportMatches.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-[#0A0A0F]/60 p-8 text-center text-sm text-slate-400">
                    Is Manager ne abhi tak koi match nahi karwaya hai.
                  </div>
                ) : (
                  reportMatches.map((t) => {
                    const matchJoins = reportJoinsMap[t.id] || [];
                    const isPrizeOpen = prizeTargetId === t.id;
                    const perKillRate = Number(t.perKillPrize || 0);
                    const bonusNum = Math.max(0, Number(prizeWinnerBonus) || 0);
                    const previewEntries = matchJoins.map((join) => {
                      const kills = Math.max(0, Math.floor(Number(prizeKillsMap[join.userId] ?? 0)));
                      const isWinner = join.userId === prizeWinnerId;
                      const killPrize = kills * perKillRate;
                      const winBonus = isWinner ? bonusNum : 0;
                      return { join, kills, isWinner, totalPrize: killPrize + winBonus };
                    });
                    const totalPreviewPayout = previewEntries.reduce((s, e) => s + e.totalPrize, 0);

                    return (
                      <div
                        key={t.id}
                        className="rounded-2xl border border-white/10 bg-[#0A0A0F]/75 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                                {t.name}
                              </span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  t.status === 'live'
                                    ? 'bg-[#00C853]/15 text-[#00C853]'
                                    : t.status === 'upcoming'
                                    ? 'bg-[#FFC107]/15 text-[#FFC107]'
                                    : t.status === 'completed'
                                    ? 'bg-sky-500/15 text-sky-400'
                                    : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {t.mode} · {t.map} · {t.matchDate} {t.matchTime} · Entry{' '}
                              <span className="font-mono font-bold text-white">₹{t.entryFee}</span> · Per Kill{' '}
                              <span className="font-mono font-bold text-[#00C853]">₹{t.perKillPrize}</span> · Winner Prize{' '}
                              <span className="font-mono font-bold text-[#FFC107]">₹{t.prizePool}</span> · Slots{' '}
                              <span className="font-mono font-bold text-white">
                                {matchJoins.length}/{t.slotsTotal}
                              </span>
                            </div>
                          </div>

                          {onDistributePrize && matchJoins.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isPrizeOpen) {
                                  setPrizeTargetId(null);
                                } else {
                                  handleOpenInlinePrize(t, matchJoins);
                                }
                              }}
                              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#FF6B00] px-3.5 text-xs font-bold text-white shadow-md shadow-[#FF6B00]/20 transition hover:bg-[#ff7f24]"
                            >
                              <Award className="h-3.5 w-3.5" />
                              {isPrizeOpen
                                ? 'Close Prize Panel'
                                : t.status === 'completed'
                                ? 'Update / Give Prize'
                                : 'Give Prize'}
                            </button>
                          )}
                        </div>

                        {/* Joined Players List */}
                        <div className="mt-3">
                          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                            <Users className="h-3.5 w-3.5 text-[#FFC107]" />
                            Joined Players List ({matchJoins.length})
                          </div>
                          {matchJoins.length === 0 ? (
                            <div className="rounded-xl border border-white/10 bg-[#12182B]/50 px-3 py-2.5 text-xs text-slate-400">
                              No players joined this match yet.
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#12182B]/60">
                              <table className="w-full text-left text-xs">
                                <thead className="border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase">
                                  <tr>
                                    <th className="px-3 py-2">Slot</th>
                                    <th className="px-3 py-2">Player Name</th>
                                    <th className="px-3 py-2">FF UID</th>
                                    <th className="px-3 py-2 text-right">Kills</th>
                                    <th className="px-3 py-2 text-right">Prize Won</th>
                                    <th className="px-3 py-2 text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {matchJoins.map((j) => (
                                    <tr key={j.id}>
                                      <td className="px-3 py-2 font-mono font-bold text-[#FFC107]">
                                        #{j.slotNumber}
                                      </td>
                                      <td className="px-3 py-2 font-bold text-white">{j.userName}</td>
                                      <td className="px-3 py-2 font-mono text-slate-300">{j.ffUid}</td>
                                      <td className="px-3 py-2 text-right font-mono text-slate-200">
                                        {Number(j.kills || 0)}
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono font-bold text-[#00C853]">
                                        ₹{Number(j.prizeWon || 0).toLocaleString('en-IN')}
                                      </td>
                                      <td className="px-3 py-2 text-right font-bold uppercase text-slate-300">
                                        {j.status}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Inline Super Admin Prize Distribution Form */}
                        {isPrizeOpen && onDistributePrize && (
                          <div className="mt-4 rounded-xl border border-[#FF6B00]/40 bg-[#12182B] p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-[#FFC107] uppercase">
                                <Award className="h-4 w-4" />
                                Super Admin Prize / Price Distribution
                              </div>
                              <span className="font-mono text-xs font-bold text-[#00C853]">
                                Total Payout: ₹{totalPreviewPayout.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {prizeError && (
                              <div className="rounded-lg border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-3 py-2 text-xs font-bold text-[#FF8A80]">
                                {prizeError}
                              </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[11px] font-bold text-slate-300 uppercase">
                                  Booyah Winner Bonus (₹)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={prizeWinnerBonus}
                                  onChange={(e) => setPrizeWinnerBonus(e.target.value)}
                                  className="min-h-[40px] w-full rounded-lg border border-white/15 bg-[#0A0A0F] px-3 font-mono text-sm font-bold text-[#FFC107]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-300 uppercase">
                                  <ImagePlus className="h-3.5 w-3.5 text-[#FF6B00]" />
                                  Result Screenshot (Optional)
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => void handleReportScreenshotChange(e)}
                                  className="block w-full cursor-pointer rounded-lg border border-white/15 bg-[#0A0A0F] px-2.5 py-1.5 text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-[#FF6B00] file:px-2 file:py-1 file:text-[11px] file:font-bold file:text-white"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              {previewEntries.map(({ join, kills, isWinner, totalPrize }) => (
                                <div
                                  key={join.id}
                                  className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                                    isWinner
                                      ? 'border-[#FFC107]/60 bg-[#FFC107]/10'
                                      : 'border-white/10 bg-[#0A0A0F]/60'
                                  }`}
                                >
                                  <label className="flex cursor-pointer items-center gap-2.5 min-w-0 flex-1">
                                    <input
                                      type="radio"
                                      name={`winner-${t.id}`}
                                      checked={isWinner}
                                      onChange={() => setPrizeWinnerId(join.userId)}
                                      className="h-4 w-4 accent-[#FF6B00]"
                                    />
                                    <span className="font-mono text-xs font-bold text-[#FFC107]">
                                      #{join.slotNumber}
                                    </span>
                                    <span className="truncate text-xs font-bold text-white">
                                      {join.userName}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-400">
                                      ({join.ffUid})
                                    </span>
                                  </label>

                                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[11px] font-bold text-slate-400 uppercase">
                                        Kills
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={99}
                                        value={kills}
                                        onChange={(e) =>
                                          setPrizeKillsMap((prev) => ({
                                            ...prev,
                                            [join.userId]: Math.max(
                                              0,
                                              Math.floor(Number(e.target.value) || 0)
                                            ),
                                          }))
                                        }
                                        className="min-h-[34px] w-16 rounded-lg border border-white/15 bg-[#12182B] px-2 text-center font-mono text-xs font-bold text-white"
                                      />
                                    </div>
                                    <div className="min-w-[74px] text-right font-mono text-sm font-bold text-[#00C853]">
                                      ₹{totalPrize.toLocaleString('en-IN')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setPrizeTargetId(null)}
                                className="min-h-[40px] rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-bold text-slate-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isDistributing}
                                onClick={() => void handleSubmitInlinePrize(t, matchJoins)}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#00C853] px-4 text-xs font-bold text-[#04140A] transition hover:brightness-110 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {isDistributing
                                  ? 'Distributing...'
                                  : `Distribute Prize (₹${totalPreviewPayout.toLocaleString('en-IN')})`}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

interface ActivityLogScreenProps {
  logs: AdminActivityLog[];
}

export const ActivityLogScreen: React.FC<ActivityLogScreenProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Admin &amp; Manager Activity Audit Logs</h2>
        <p className="text-sm text-slate-400">Track all administrative actions, tournament creations, room updates, and wallet approvals.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1A2238] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#12182B] text-slate-400 uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Admin / Manager</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {log.actorName || 'Admin'} <span className="text-[10px] text-slate-400 font-mono">({log.actorRole})</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#FFC107] font-bold">
                      {log.actionType}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {log.summary || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

