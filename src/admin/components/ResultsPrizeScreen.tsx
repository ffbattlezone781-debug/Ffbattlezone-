import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ImagePlus, Trophy } from 'lucide-react';
import { getLobbyShortLabel, type AssignedLobby, type Tournament, type TournamentJoin } from '../types';
import { compressImageToDataUrl } from '../firebase';

export interface DistributePrizeEntry {
  join: TournamentJoin;
  kills: number;
  isWinner: boolean;
  killPrize: number;
  winBonus: number;
  totalPrize: number;
}

export interface DistributePrizePayload {
  tournament: Tournament;
  winnerBonus: number;
  screenshotDataUrl: string;
  entries: DistributePrizeEntry[];
}

interface ResultsPrizeScreenProps {
  assignedLobby?: AssignedLobby;
  tournaments: Tournament[];
  onLoadJoins: (tournamentId: string) => Promise<TournamentJoin[]>;
  onDistributePrize: (payload: DistributePrizePayload) => Promise<boolean>;
  isSubmitting: boolean;
}

export const ResultsPrizeScreen: React.FC<ResultsPrizeScreenProps> = ({
  assignedLobby = 'all',
  tournaments,
  onLoadJoins,
  onDistributePrize,
  isSubmitting,
}) => {
  const selectable = tournaments.filter((t) => t.status !== 'cancelled');
  const [selectedId, setSelectedId] = useState<string>('');
  const [winnerBonus, setWinnerBonus] = useState<string>('500');
  const [joins, setJoins] = useState<TournamentJoin[]>([]);
  const [loadingJoins, setLoadingJoins] = useState(false);
  const [winnerUserId, setWinnerUserId] = useState<string>('');
  const [killsMap, setKillsMap] = useState<Record<string, number>>({});
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedTournament = selectable.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId && selectable.length > 0) {
      const preferred =
        selectable.find((t) => t.status === 'live') ||
        selectable.find((t) => t.status === 'upcoming') ||
        selectable[0];
      if (preferred) {
        setSelectedId(preferred.id);
        setWinnerBonus(String(preferred.prizePool || 500));
      }
    }
  }, [selectable, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setJoins([]);
      return;
    }
    let active = true;
    setLoadingJoins(true);
    setErrorMsg('');
    void onLoadJoins(selectedId)
      .then((list) => {
        if (!active) return;
        const activeJoins = list.filter((j) => j.status !== 'refunded');
        setJoins(activeJoins);
        if (activeJoins.length > 0) {
          setWinnerUserId(activeJoins[0].userId);
          const initialKills: Record<string, number> = {};
          activeJoins.forEach((j) => {
            initialKills[j.userId] = Number(j.kills || 0);
          });
          setKillsMap(initialKills);
        } else {
          setWinnerUserId('');
          setKillsMap({});
        }
      })
      .finally(() => {
        if (active) setLoadingJoins(false);
      });
    return () => {
      active = false;
    };
  }, [selectedId, onLoadJoins]);

  function handleSelectTournament(tId: string) {
    setSelectedId(tId);
    const match = selectable.find((t) => t.id === tId);
    if (match) {
      setWinnerBonus(String(match.prizePool || 0));
    }
  }

  async function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      const compressed = await compressImageToDataUrl(file, 900, 185000);
      setScreenshotDataUrl(compressed);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process screenshot.');
    }
  }

  const perKillRate = Number(selectedTournament?.perKillPrize || 0);
  const bonusAmount = Math.max(0, Number(winnerBonus) || 0);

  const calculatedEntries: DistributePrizeEntry[] = joins.map((join) => {
    const kills = Math.max(0, Math.floor(Number(killsMap[join.userId] ?? 0)));
    const isWinner = join.userId === winnerUserId;
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

  const totalPayout = calculatedEntries.reduce((sum, item) => sum + item.totalPrize, 0);
  const totalKills = calculatedEntries.reduce((sum, item) => sum + item.kills, 0);

  async function handleDistribute(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedTournament) {
      setErrorMsg('Please select a tournament first.');
      return;
    }
    if (joins.length === 0) {
      setErrorMsg('No joined players found in this tournament to distribute prizes.');
      return;
    }
    if (!winnerUserId) {
      setErrorMsg('Please select the Booyah Winner.');
      return;
    }

    const ok = await onDistributePrize({
      tournament: selectedTournament,
      winnerBonus: bonusAmount,
      screenshotDataUrl,
      entries: calculatedEntries,
    });
    if (ok) {
      setScreenshotDataUrl('');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-white sm:text-2xl">
          {assignedLobby === 'all'
            ? 'Results & Prize Distribution'
            : `${getLobbyShortLabel(assignedLobby)} Lobby — Results & Prize`}
        </h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Select tournament, mark Booyah winner and kills, preview auto-calculated payout, and distribute in one click.
        </p>
      </div>

      <form onSubmit={(e) => void handleDistribute(e)} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Setup Column */}
        <div className="space-y-5 rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6 lg:col-span-5">
          {errorMsg && (
            <div className="rounded-xl border border-[#FF3B30]/40 bg-[#FF3B30]/10 px-4 py-3 text-xs font-bold text-[#FF8A80]">
              {errorMsg}
            </div>
          )}

          <div>
            <label htmlFor="res-select-match" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Select Tournament
            </label>
            <select
              id="res-select-match"
              value={selectedId}
              onChange={(e) => handleSelectTournament(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
            >
              {selectable.length === 0 && <option value="">No tournaments available</option>}
              {selectable.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status.toUpperCase()} · {t.slotsFilled} joined)
                </option>
              ))}
            </select>
          </div>

          {selectedTournament && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-[#0A0A0F]/70 p-4 text-xs">
              <div>
                <div className="text-slate-400">Per Kill Prize</div>
                <div className="mt-0.5 font-mono text-lg font-bold text-[#00C853]">
                  ₹{perKillRate}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Match Mode &amp; Map</div>
                <div className="mt-0.5 font-bold text-white">
                  {selectedTournament.mode} · {selectedTournament.map}
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="res-winner-bonus" className="mb-2 block text-xs font-bold tracking-wider text-slate-300 uppercase">
              Booyah Winner Bonus (₹)
            </label>
            <input
              id="res-winner-bonus"
              type="number"
              min={0}
              value={winnerBonus}
              onChange={(e) => setWinnerBonus(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-white/15 bg-[#0A0A0F] px-4 font-mono text-base font-bold text-[#FFC107] focus:border-[#FF6B00] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="res-screenshot-file" className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
              <ImagePlus className="h-4 w-4 text-[#FF6B00]" />
              Result Screenshot (Optional)
            </label>
            <input
              id="res-screenshot-file"
              type="file"
              accept="image/*"
              onChange={(e) => void handleScreenshotChange(e)}
              className="block w-full cursor-pointer rounded-xl border border-white/15 bg-[#0A0A0F] px-3 py-2.5 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF6B00] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
            {screenshotDataUrl && (
              <img
                src={screenshotDataUrl}
                alt="Result scoreboard preview"
                referrerPolicy="no-referrer"
                className="mt-3 aspect-video w-full rounded-xl border border-white/15 object-cover"
              />
            )}
          </div>

          {/* Live Summary */}
          <div className="rounded-xl border border-[#FFC107]/30 bg-[#0A0A0F] p-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Kills Recorded</span>
              <span className="font-mono text-sm font-bold text-white">{totalKills} Kills</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
              <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                Total Payout Auto-Calculated
              </span>
              <span className="font-mono text-2xl font-bold tabular-nums text-[#00C853]">
                ₹{totalPayout.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Right Roster & Auto Calculate Column */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12182B] p-5 sm:p-6 lg:col-span-7">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[#FFC107]" />
                <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-white">
                  Joined Players ({joins.length})
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Select Winner &amp; Enter Kills
              </span>
            </div>

            {loadingJoins ? (
              <div className="py-12 text-center text-sm text-slate-400">Loading joined players...</div>
            ) : calculatedEntries.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-[#0A0A0F]/60 p-8 text-center text-sm text-slate-400">
                No joined players in this tournament yet.
              </div>
            ) : (
              <div className="space-y-3">
                {calculatedEntries.map(({ join, kills, isWinner, totalPrize }) => (
                  <div
                    key={join.id}
                    className={`flex flex-col gap-3 rounded-xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
                      isWinner
                        ? 'border-[#FFC107]/60 bg-[#FFC107]/10'
                        : 'border-white/10 bg-[#0A0A0F]/70'
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-3 min-w-0 flex-1">
                      <input
                        type="radio"
                        name="booyah-winner"
                        checked={isWinner}
                        onChange={() => setWinnerUserId(join.userId)}
                        className="h-4 w-4 accent-[#FF6B00]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#FFC107]">
                            #{join.slotNumber}
                          </span>
                          <span className="truncate text-sm font-bold text-white">
                            {join.userName}
                          </span>
                          {isWinner && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FFC107] uppercase">
                              <Award className="h-3.5 w-3.5" />
                              Winner
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-slate-400">
                          FF UID: {join.ffUid}
                        </div>
                      </div>
                    </label>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor={`kills-${join.userId}`}
                          className="text-xs font-bold text-slate-400 uppercase"
                        >
                          Kills
                        </label>
                        <input
                          id={`kills-${join.userId}`}
                          type="number"
                          min={0}
                          max={99}
                          value={kills}
                          onChange={(e) =>
                            setKillsMap((prev) => ({
                              ...prev,
                              [join.userId]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                            }))
                          }
                          className="min-h-[40px] w-20 rounded-lg border border-white/15 bg-[#12182B] px-2.5 text-center font-mono text-sm font-bold text-white focus:border-[#FF6B00] focus:outline-none"
                        />
                      </div>

                      <div className="min-w-[88px] text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Payout</div>
                        <div className="font-mono text-base font-bold tabular-nums text-[#00C853]">
                          ₹{totalPrize.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <button
              type="submit"
              disabled={isSubmitting || joins.length === 0}
              className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#FF6B00] px-6 py-3 font-[family-name:var(--font-display)] text-base font-bold tracking-wide text-white shadow-xl shadow-[#FF6B00]/25 transition hover:bg-[#ff7f24] disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              {isSubmitting
                ? 'Distributing Prizes...'
                : `Distribute Prize (₹${totalPayout.toLocaleString('en-IN')})`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
