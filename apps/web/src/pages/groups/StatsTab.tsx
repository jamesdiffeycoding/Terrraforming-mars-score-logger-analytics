import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Player { id: string; displayName: string }

interface LeaderboardRow {
  player: Player;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  avgScore: number | null;
  avgTr: number | null;
}

interface CorpStat {
  corporation: { id: string; name: string };
  plays: number;
  wins: number;
  winRate: number;
  avgScore: number | null;
  pickRate: number;
}

interface PlayerStats {
  player: Player;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  avgScore: number | null;
  bestScore: number | null;
  avgTr: number | null;
  favouriteCorporation: { name: string; count: number; wins: number } | null;
  boardBreakdown: { name: string; count: number; wins: number }[];
  recentGames: {
    gameId: string;
    playedAt: string;
    board: string;
    corporation: string | null;
    score: number | null;
    placement: number | null;
    isWinner: boolean;
  }[];
}

interface H2H {
  playerA: Player | null;
  playerB: Player | null;
  gamesPlayed: number;
  playerAWins: number;
  playerBWins: number;
  ties: number;
  games: {
    gameId: string;
    playedAt: string;
    board: string;
    playerA: { score: number | null; placement: number | null; corporation: string | null; isWinner: boolean };
    playerB: { score: number | null; placement: number | null; corporation: string | null; isWinner: boolean };
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(rate: number) { return `${(rate * 100).toFixed(0)}%`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

type SubTab = 'leaderboard' | 'corporations' | 'players' | 'h2h';

// ── StatsTab ──────────────────────────────────────────────────────────────────

export function StatsTab({ groupId }: { groupId: string }) {
  const [subTab, setSubTab] = useState<SubTab>('leaderboard');
  const [players, setPlayers] = useState<Player[]>([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  // Corporations
  const [corps, setCorps] = useState<CorpStat[] | null>(null);
  // Player profile
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  // H2H
  const [h2hA, setH2hA] = useState('');
  const [h2hB, setH2hB] = useState('');
  const [h2h, setH2h] = useState<H2H | null>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  useEffect(() => {
    api.get<Player[]>(`/groups/${groupId}/players`).then(setPlayers).catch(() => {});
  }, [groupId]);

  useEffect(() => {
    if (subTab === 'leaderboard' && !leaderboard) {
      api.get<LeaderboardRow[]>(`/groups/${groupId}/stats/leaderboard`)
        .then(setLeaderboard)
        .catch(() => toast.error('Failed to load leaderboard'));
    }
    if (subTab === 'corporations' && !corps) {
      api.get<CorpStat[]>(`/groups/${groupId}/stats/corporations`)
        .then(setCorps)
        .catch(() => toast.error('Failed to load corporation stats'));
    }
  }, [subTab, groupId, leaderboard, corps]);

  async function loadPlayerStats() {
    if (!selectedPlayerId) return;
    setPlayerLoading(true);
    setPlayerStats(null);
    try {
      const s = await api.get<PlayerStats>(`/groups/${groupId}/stats/players/${selectedPlayerId}`);
      setPlayerStats(s);
    } catch {
      toast.error('Failed to load player stats');
    } finally {
      setPlayerLoading(false);
    }
  }

  async function loadH2H() {
    if (!h2hA || !h2hB || h2hA === h2hB) { toast.error('Select two different players'); return; }
    setH2hLoading(true);
    setH2h(null);
    try {
      const result = await api.get<H2H>(`/groups/${groupId}/stats/head-to-head?playerA=${h2hA}&playerB=${h2hB}`);
      setH2h(result);
    } catch {
      toast.error('Failed to load head-to-head');
    } finally {
      setH2hLoading(false);
    }
  }

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'leaderboard', label: 'Leaderboard' },
    { key: 'corporations', label: 'Corporations' },
    { key: 'players', label: 'Player' },
    { key: 'h2h', label: 'Head-to-head' },
  ];

  return (
    <div className="grid gap-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 flex-wrap">
        {SUB_TABS.map((st) => (
          <button
            key={st.key}
            onClick={() => setSubTab(st.key)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              subTab === st.key
                ? 'bg-foreground text-background font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* ── Leaderboard ── */}
      {subTab === 'leaderboard' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Leaderboard</CardTitle></CardHeader>
          <CardContent>
            {!leaderboard ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No games recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left py-2 font-medium">#</th>
                      <th className="text-left py-2 font-medium">Player</th>
                      <th className="text-right py-2 font-medium">Games</th>
                      <th className="text-right py-2 font-medium">Wins</th>
                      <th className="text-right py-2 font-medium">Win %</th>
                      <th className="text-right py-2 font-medium">Avg score</th>
                      <th className="text-right py-2 font-medium">Avg TR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, i) => (
                      <tr key={row.player.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 text-muted-foreground font-mono text-xs">{i + 1}</td>
                        <td className="py-2.5 font-medium">{row.player.displayName}</td>
                        <td className="py-2.5 text-right tabular-nums">{row.gamesPlayed}</td>
                        <td className="py-2.5 text-right tabular-nums">{row.wins}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          <span className={row.winRate >= 0.5 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                            {row.gamesPlayed > 0 ? pct(row.winRate) : '–'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{row.avgScore ?? '–'}</td>
                        <td className="py-2.5 text-right tabular-nums">{row.avgTr ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Corporations ── */}
      {subTab === 'corporations' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Corporation performance</CardTitle></CardHeader>
          <CardContent>
            {!corps ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : corps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No corporation data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left py-2 font-medium">Corporation</th>
                      <th className="text-right py-2 font-medium">Plays</th>
                      <th className="text-right py-2 font-medium">Wins</th>
                      <th className="text-right py-2 font-medium">Win %</th>
                      <th className="text-right py-2 font-medium">Avg score</th>
                      <th className="text-right py-2 font-medium">Pick rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corps.map((c) => (
                      <tr key={c.corporation.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-medium">{c.corporation.name}</td>
                        <td className="py-2.5 text-right tabular-nums">{c.plays}</td>
                        <td className="py-2.5 text-right tabular-nums">{c.wins}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          <span className={c.winRate >= 0.5 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>
                            {pct(c.winRate)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{c.avgScore ?? '–'}</td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">{pct(c.pickRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Player profile ── */}
      {subTab === 'players' && (
        <div className="grid gap-4">
          <div className="flex gap-2">
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="flex-1 h-9 rounded-lg border px-2 text-sm bg-background"
            >
              <option value="">Select player…</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
            <Button size="sm" onClick={loadPlayerStats} disabled={!selectedPlayerId || playerLoading}>
              {playerLoading ? 'Loading…' : 'View stats'}
            </Button>
          </div>

          {playerStats && (
            <div className="grid gap-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Games', value: playerStats.gamesPlayed },
                  { label: 'Wins', value: playerStats.wins },
                  { label: 'Win rate', value: pct(playerStats.winRate) },
                  { label: 'Avg score', value: playerStats.avgScore ?? '–' },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="pt-4 pb-3 text-center">
                      <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Favourite corp */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Favourite corporation</CardTitle></CardHeader>
                  <CardContent>
                    {playerStats.favouriteCorporation ? (
                      <div>
                        <p className="font-semibold">{playerStats.favouriteCorporation.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {playerStats.favouriteCorporation.count} games · {playerStats.favouriteCorporation.wins} wins
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No data</p>
                    )}
                  </CardContent>
                </Card>

                {/* Board breakdown */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Boards played</CardTitle></CardHeader>
                  <CardContent className="grid gap-1.5">
                    {playerStats.boardBreakdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No data</p>
                    ) : playerStats.boardBreakdown.map((b) => (
                      <div key={b.name} className="flex justify-between text-sm">
                        <span>{b.name}</span>
                        <span className="text-muted-foreground tabular-nums">{b.count} games · {b.wins}W</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Recent games */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Recent games</CardTitle></CardHeader>
                <CardContent>
                  {playerStats.recentGames.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No games yet.</p>
                  ) : (
                    <div className="grid gap-2">
                      {playerStats.recentGames.map((g) => (
                        <div key={g.gameId} className="flex items-center gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                          <div className={`w-6 text-center text-xs font-mono font-bold ${g.isWinner ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            #{g.placement ?? '–'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{g.board}</p>
                            <p className="text-xs text-muted-foreground">{fmtDate(g.playedAt)}{g.corporation ? ` · ${g.corporation}` : ''}</p>
                          </div>
                          {g.score != null && (
                            <span className="text-xs tabular-nums shrink-0">{g.score} pts</span>
                          )}
                          {g.isWinner && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-1.5 py-0.5 rounded font-medium">Win</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ── Head-to-head ── */}
      {subTab === 'h2h' && (
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Head-to-head</CardTitle></CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={h2hA}
                  onChange={(e) => setH2hA(e.target.value)}
                  className="h-9 rounded-lg border px-2 text-sm bg-background"
                >
                  <option value="">Player A…</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </select>
                <select
                  value={h2hB}
                  onChange={(e) => setH2hB(e.target.value)}
                  className="h-9 rounded-lg border px-2 text-sm bg-background"
                >
                  <option value="">Player B…</option>
                  {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </select>
              </div>
              <Button size="sm" onClick={loadH2H} disabled={h2hLoading}>
                {h2hLoading ? 'Loading…' : 'Compare'}
              </Button>

              {h2h && (
                <div className="grid gap-4 mt-2">
                  {h2h.gamesPlayed === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No shared games found.</p>
                  ) : (
                    <>
                      {/* Score banner */}
                      <div className="flex items-center justify-between text-center border rounded-lg p-4">
                        <div>
                          <p className="text-3xl font-bold">{h2h.playerAWins}</p>
                          <p className="text-sm font-medium mt-1 truncate max-w-[100px]">{h2h.playerA?.displayName}</p>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          <p>{h2h.gamesPlayed} games</p>
                          {h2h.ties > 0 && <p className="text-xs">{h2h.ties} tied</p>}
                        </div>
                        <div>
                          <p className="text-3xl font-bold">{h2h.playerBWins}</p>
                          <p className="text-sm font-medium mt-1 truncate max-w-[100px]">{h2h.playerB?.displayName}</p>
                        </div>
                      </div>

                      {/* Game-by-game */}
                      <div className="grid gap-1.5">
                        {h2h.games.map((g) => (
                          <div key={g.gameId} className="text-xs grid grid-cols-[1fr_auto_1fr] gap-2 items-center border rounded p-2">
                            <div className={`text-right ${g.playerA.isWinner ? 'font-semibold text-yellow-600' : 'text-muted-foreground'}`}>
                              {g.playerA.score != null ? `${g.playerA.score}pts` : '–'}
                              {g.playerA.corporation ? ` · ${g.playerA.corporation}` : ''}
                            </div>
                            <div className="text-center text-muted-foreground shrink-0">
                              <p>{g.board}</p>
                              <p className="text-[10px]">{fmtDate(g.playedAt)}</p>
                            </div>
                            <div className={`${g.playerB.isWinner ? 'font-semibold text-yellow-600' : 'text-muted-foreground'}`}>
                              {g.playerB.corporation ? `${g.playerB.corporation} · ` : ''}
                              {g.playerB.score != null ? `${g.playerB.score}pts` : '–'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
