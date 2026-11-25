import React, { useState } from 'react';
import {
  Activity,
  History,
  Lock,
  Phone,
  Power,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  LOBBY_CONFIG,
  sanitizeMobileDigits,
  type AdminAccountRecord,
  type AdminActivityLog,
  type AssignedLobby,
  type ManagerLobbyChoice,
} from '../types';
import { formatTimestamp } from '../firebase';

export interface CreateManagerPayload {
  name: string;
  mobile: string;
  password: string;
  assigned_lobby: ManagerLobbyChoice;
}

interface ManageManagersScreenProps {
  managers: AdminAccountRecord[];
  onCreateManager: (payload: CreateManagerPayload) => Promise<boolean>;
  onToggleManagerActive: (manager: AdminAccountRecord) => Promise<void>;
  onChangeManagerLobby: (manager: AdminAccountRecord, lobby: ManagerLobbyChoice) => Promise<void>;
  onDeleteManager: (manager: AdminAccountRecord) => Promise<void>;
  busyId: string | null;
}

const LOBBY_CHOICES: ManagerLobbyChoice[] = ['solo', 'duo', 'squad', 'custom'];

function lobbyAccent(lobby?: AssignedLobby): string {
  if (lobby === 'solo') return 'border-[#FFC107]/40 bg-[#FFC107]/12 text-[#FFC107]';
  if (lobby === 'duo') return 'border-sky-400/40 bg-sky-400/12 text-sky-300';
  if (lobby === 'squad') return 'border-[#00C853]/40 bg-[#00C853]/12 text-[#69F0AE]';
  if (lobby === 'custom') return 'border-purple-400/40 bg-purple-400/12 text-purple-300';
  return 'border-white/20 bg-white/10 text-slate-200';
}

export const ManageManagersScreen: React.FC<ManageManagersScreenProps> = ({
  managers,
  onCreateManager,
  onToggleManagerActive,
  onChangeManagerLobby,
  onDeleteManager,
  busyId,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [lobby, setLobby] = useState<ManagerLobbyChoice>('solo');
  const [formError, setFormError] = useState('');
  const [lobbyFilter, setLobbyFilter] = useState<'ALL' | ManagerLobbyChoice>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const lobbyManagers = managers.filter((m) => m.role === 'lobby_manager');
  const superAdmins = managers.filter((m) => m.role !== 'lobby_manager');

  const filteredManagers = lobbyManagers.filter((m) =>
    lobbyFilter === 'ALL' ? true : m.assigned_lobby === lobbyFilter
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    const digits = sanitizeMobileDigits(mobile);

    if (cleanName.length < 2 || cleanName.length > 48) {
      setFormError('Manager ka naam 2 se 48 characters ka hona chahiye.');
      return;
    }
    if (digits.length < 10 || digits.length > 15) {
      setFormError('Valid 10-digit Mobile Number daalein.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password kam se kam 6 characters ka hona chahiye.');
      return;
    }

    const ok = await onCreateManager({
      name: cleanName,
      mobile: digits,
      password,
      assigned_lobby: lobby,
    });

    if (ok) {
      setName('');
      setMobile('');
      setPassword('');
      setLobby('solo');
      setShowAddForm(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
            Role-Based Lobby Managers
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Super Admin har Lobby (SOLO / DUO / SQUAD / CUSTOM) ke liye alag Manager assign aur ON/OFF kar sakta hai.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setFormError('');
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24]"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showAddForm ? 'Close Form' : 'Add Manager'}
        </button>
      </div>

      {/* Add Manager Form */}
      {showAddForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-2xl border border-[#FF6B00]/40 bg-[#12182B] p-5 shadow-xl sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#FF6B00]" />
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                Create New Lobby Manager
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Mobile + Password se Login karega
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

            <div>
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

            <div>
              <label htmlFor="mgr-lobby" className="mb-1.5 block text-xs font-bold text-slate-300 uppercase">
                Assign Lobby
              </label>
              <select
                id="mgr-lobby"
                value={lobby}
                onChange={(e) => setLobby(e.target.value as ManagerLobbyChoice)}
                className="min-h-[46px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
              >
                <option value="solo">SOLO Lobby (SOLO, CS 1VS1, LW 1VS1, 1VS1 HEAD/HIGH)</option>
                <option value="duo">DUO Lobby (DUO, CS 2VS2, LW 2VS2)</option>
                <option value="squad">SQUAD Lobby (SQUAD, FULL MAP, SURVIVAL, 4V4 LOBBY)</option>
                <option value="custom">CUSTOM Lobby (CUSTOM, LOSS TO WIN, ONE TAP, LONE WOLF)</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
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
              {busyId === 'create-manager' ? 'Creating Manager...' : 'Save & Activate Manager'}
            </button>
          </div>
        </form>
      )}

      {/* Quick Lobby Roster Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LOBBY_CHOICES.map((key) => {
          const assigned = lobbyManagers.filter((m) => m.assigned_lobby === key);
          const activeCount = assigned.filter((m) => m.is_active !== false).length;
          return (
            <div
              key={key}
              className="rounded-2xl border border-white/10 bg-[#12182B] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  {LOBBY_CONFIG[key].shortLabel} Lobby
                </span>
                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${lobbyAccent(key)}`}>
                  {activeCount} ON
                </span>
              </div>
              <div className="mt-2 truncate text-sm font-bold text-white">
                {assigned.length === 0
                  ? 'No Manager'
                  : assigned.map((m) => m.name || m.email).join(', ')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lobby Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#12182B] p-4">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#0A0A0F] p-1">
          {(['ALL', ...LOBBY_CHOICES] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setLobbyFilter(tab)}
              className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase transition ${
                lobbyFilter === tab
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? `All Managers (${lobbyManagers.length})` : tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-[#00C853]" />
          <span>{superAdmins.length} Super Admin(s) Active</span>
        </div>
      </div>

      {/* Manager List Table & Cards */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12182B]">
        {filteredManagers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-slate-500" />
            <p className="text-sm font-semibold text-slate-300">
              Abhi koi Lobby Manager add nahi kiya gaya hai.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Upar &ldquo;Add Manager&rdquo; button dabakar SOLO, DUO, SQUAD ya CUSTOM manager banayein.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0A0A0F]/60 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                    <th className="px-5 py-3.5">Manager Naam</th>
                    <th className="px-5 py-3.5">Mobile / Login</th>
                    <th className="px-5 py-3.5">Assigned Lobby</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">ON / OFF &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {filteredManagers.map((m) => {
                    const isOn = m.is_active !== false;
                    const assignedLobby = (m.assigned_lobby || 'solo') as ManagerLobbyChoice;
                    const busy = busyId === `mgr-${m.id}`;

                    return (
                      <tr key={m.id} className="transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{m.name || 'Lobby Manager'}</div>
                          <div className="text-[11px] text-slate-400">
                            Added {formatTimestamp(m.createdAt)}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-white">
                            <Phone className="h-3.5 w-3.5 text-[#FFC107]" />
                            {m.mobile || m.email}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <select
                            aria-label={`Change lobby for ${m.name || m.email}`}
                            value={assignedLobby}
                            disabled={busy}
                            onChange={(e) =>
                              void onChangeManagerLobby(m, e.target.value as ManagerLobbyChoice)
                            }
                            className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-bold uppercase focus:outline-none ${lobbyAccent(
                              assignedLobby
                            )}`}
                          >
                            {LOBBY_CHOICES.map((c) => (
                              <option key={c} value={c} className="bg-[#12182B] text-white">
                                {c.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase ${
                              isOn ? 'text-[#00C853]' : 'text-[#FF3B30]'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isOn ? 'bg-[#00C853]' : 'bg-[#FF3B30]'
                              }`}
                            />
                            {isOn ? 'ON (Active)' : 'OFF (Blocked)'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onToggleManagerActive(m)}
                              className={`inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                                isOn
                                  ? 'border border-[#FF3B30]/40 bg-[#FF3B30]/15 text-[#FF8A80] hover:bg-[#FF3B30] hover:text-white'
                                  : 'border border-[#00C853]/40 bg-[#00C853]/15 text-[#69F0AE] hover:bg-[#00C853] hover:text-[#04140A]'
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {isOn ? 'Turn OFF' : 'Turn ON'}
                            </button>

                            {confirmDeleteId === m.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={async () => {
                                    await onDeleteManager(m);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="min-h-[38px] rounded-lg bg-[#FF3B30] px-3 text-xs font-bold text-white"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="min-h-[38px] rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-bold text-slate-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setConfirmDeleteId(m.id)}
                                className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-[#FF3B30]/50 hover:text-[#FF8A80]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-white/10 md:hidden">
              {filteredManagers.map((m) => {
                const isOn = m.is_active !== false;
                const assignedLobby = (m.assigned_lobby || 'solo') as ManagerLobbyChoice;
                const busy = busyId === `mgr-${m.id}`;

                return (
                  <div key={m.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-white">{m.name || 'Lobby Manager'}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-300">
                          Mobile: {m.mobile || m.email}
                        </div>
                      </div>
                      <span
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase ${lobbyAccent(
                          assignedLobby
                        )}`}
                      >
                        {assignedLobby}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className={isOn ? 'font-bold text-[#00C853]' : 'font-bold text-[#FF3B30]'}>
                        {isOn ? 'ON (Active)' : 'OFF (Blocked)'}
                      </span>
                      <select
                        aria-label={`Change lobby for ${m.name || m.email}`}
                        value={assignedLobby}
                        disabled={busy}
                        onChange={(e) =>
                          void onChangeManagerLobby(m, e.target.value as ManagerLobbyChoice)
                        }
                        className="min-h-[36px] rounded-lg border border-white/15 bg-[#0A0A0F] px-2.5 text-xs font-bold text-white uppercase"
                      >
                        {LOBBY_CHOICES.map((c) => (
                          <option key={c} value={c}>
                            {c.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onToggleManagerActive(m)}
                        className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${
                          isOn
                            ? 'bg-[#FF3B30]/20 text-[#FF8A80]'
                            : 'bg-[#00C853]/20 text-[#69F0AE]'
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {isOn ? 'Turn OFF' : 'Turn ON'}
                      </button>

                      {confirmDeleteId === m.id ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            await onDeleteManager(m);
                            setConfirmDeleteId(null);
                          }}
                          className="min-h-[40px] rounded-xl bg-[#FF3B30] text-xs font-bold text-white"
                        >
                          Confirm Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmDeleteId(m.id)}
                          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 text-xs font-bold text-slate-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Super Admin Info Box */}
      <div className="rounded-2xl border border-white/10 bg-[#12182B]/70 p-4 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-bold text-white">
          <Lock className="h-4 w-4 text-[#FFC107]" />
          Security &amp; Lobby Isolation Active
        </div>
        <p className="mt-1 text-slate-400">
          Lobby Managers ko sirf unki assigned lobby ke tournaments dikhte hain. Wallet, Withdrawals, QR Deposits, Banners aur dusri lobby database rules se blocked hain.
        </p>
      </div>
    </div>
  );
};

interface ActivityLogScreenProps {
  logs: AdminActivityLog[];
  onClearLogs: () => Promise<void>;
  busyId: string | null;
}

export const ActivityLogScreen: React.FC<ActivityLogScreenProps> = ({
  logs,
  onClearLogs,
  busyId,
}) => {
  const [lobbyFilter, setLobbyFilter] = useState<'ALL' | AssignedLobby>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = logs.filter((log) => {
    const lobbyOk = lobbyFilter === 'ALL' ? true : log.assignedLobby === lobbyFilter;
    const q = searchQuery.trim().toLowerCase();
    const searchOk =
      !q ||
      log.actorName.toLowerCase().includes(q) ||
      log.summary.toLowerCase().includes(q) ||
      (log.tournamentName || '').toLowerCase().includes(q);
    return lobbyOk && searchOk;
  });

  function actionBadge(actionType: string) {
    if (actionType.includes('room')) return 'bg-[#FFC107]/15 text-[#FFC107]';
    if (actionType.includes('result')) return 'bg-[#00C853]/15 text-[#69F0AE]';
    if (actionType.includes('delete') || actionType.includes('cancel')) {
      return 'bg-[#FF3B30]/15 text-[#FF8A80]';
    }
    return 'bg-[#FF6B00]/15 text-[#FF9E5E]';
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
            Manager Activity Log
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Har Lobby Manager aur Super Admin ne kya action liya (Tournament add/edit, Room ID update, Result publish), sab live record hota hai.
          </p>
        </div>

        {logs.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <>
                <button
                  type="button"
                  disabled={busyId === 'clear-logs'}
                  onClick={async () => {
                    await onClearLogs();
                    setConfirmClear(false);
                  }}
                  className="min-h-[40px] rounded-xl bg-[#FF3B30] px-4 text-xs font-bold text-white"
                >
                  {busyId === 'clear-logs' ? 'Clearing...' : 'Confirm Clear All'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[40px] rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 text-xs font-bold text-[#FF8A80] hover:bg-[#FF3B30] hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Logs
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#12182B] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-[#0A0A0F] p-1">
          {(['ALL', 'solo', 'duo', 'squad', 'custom', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setLobbyFilter(tab)}
              className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-bold uppercase transition ${
                lobbyFilter === tab
                  ? 'bg-[#FF6B00] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? `All (${logs.length})` : tab === 'all' ? 'Super Admin' : tab}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search manager name or action..."
          className="min-h-[40px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-3.5 text-sm text-white placeholder:text-slate-500 focus:border-[#FF6B00] focus:outline-none lg:w-72"
        />
      </div>

      {/* Activity Feed */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#12182B]">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <History className="mx-auto mb-3 h-9 w-9 text-slate-500" />
            <p className="text-sm font-medium text-slate-400">
              Koi activity log record nahi mila.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-4 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FF6B00]/15 text-[#FF6B00]">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{item.summary}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{item.actorName}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${lobbyAccent(
                          item.assignedLobby
                        )}`}
                      >
                        {item.actorRole === 'super_admin'
                          ? 'SUPER ADMIN'
                          : `${item.assignedLobby.toUpperCase()} MANAGER`}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${actionBadge(
                          item.actionType
                        )}`}
                      >
                        {item.actionType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 font-mono text-xs text-slate-400 sm:text-right">
                  {formatTimestamp(item.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
