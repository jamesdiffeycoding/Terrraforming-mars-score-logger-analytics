import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  Cell,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LeaderboardRow {
  player: { id: string; displayName: string };
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
}

interface GamePlayer {
  player: { id: string; displayName: string };
  score: number | null;
  isWinner: boolean;
  corporation: { name: string } | null;
}

interface Game {
  id: string;
  playedAt: string;
  board: { name: string };
  gamePlayers: GamePlayer[];
}

// ── Palette ───────────────────────────────────────────────────────────────────

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

function color(i: number) { return PALETTE[i % PALETTE.length] ?? PALETTE[0]; }

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ScoreTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-2 text-xs grid gap-0.5">
      <p className="font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="flex-1">{p.name}</span>
          <span className="font-mono font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Derived data helpers ───────────────────────────────────────────────────────

function buildScoreTrend(games: Game[], players: { id: string; displayName: string }[]) {
  const sorted = [...games].sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime());
  return sorted.map((g) => {
    const point: Record<string, string | number> = {
      date: new Date(g.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
    for (const p of players) {
      const gp = g.gamePlayers.find((x) => x.player.id === p.id);
      if (gp?.score != null) point[p.displayName] = gp.score;
    }
    return point;
  });
}

function buildWinRateData(leaderboard: LeaderboardRow[]) {
  return leaderboard
    .filter((r) => r.gamesPlayed > 0)
    .map((r) => ({
      name: r.player.displayName,
      'Win %': Math.round(r.winRate * 100),
      Games: r.gamesPlayed,
    }));
}

function buildCorpData(corps: CorpStat[]) {
  return corps
    .slice(0, 12)
    .map((c) => ({
      name: c.corporation.name.length > 14 ? c.corporation.name.slice(0, 13) + '…' : c.corporation.name,
      fullName: c.corporation.name,
      Plays: c.plays,
      'Win %': Math.round(c.winRate * 100),
      'Avg score': c.avgScore ?? 0,
    }));
}

function buildAvgScoreData(leaderboard: LeaderboardRow[]) {
  return leaderboard
    .filter((r) => r.avgScore !== null)
    .map((r) => ({
      name: r.player.displayName,
      'Avg score': r.avgScore!,
      'Avg TR': r.avgTr ?? 0,
    }))
    .sort((a, b) => b['Avg score'] - a['Avg score']);
}

// ── AnalyticsTab ───────────────────────────────────────────────────────────────

export function AnalyticsTab({ groupId }: { groupId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [corps, setCorps] = useState<CorpStat[] | null>(null);
  const [games, setGames] = useState<Game[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<LeaderboardRow[]>(`/groups/${groupId}/stats/leaderboard`),
      api.get<CorpStat[]>(`/groups/${groupId}/stats/corporations`),
      api.get<Game[]>(`/groups/${groupId}/games`),
    ])
      .then(([lb, c, g]) => { setLeaderboard(lb); setCorps(c); setGames(g); })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;

  if (!leaderboard || !games || !corps) return null;

  const players = leaderboard.map((r) => r.player);
  const hasGames = games.length > 0;

  if (!hasGames) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No games recorded yet — analytics will appear once games are added.
      </p>
    );
  }

  const scoreTrend = buildScoreTrend(games, players);
  const winRateData = buildWinRateData(leaderboard);
  const corpData = buildCorpData(corps);
  const avgScoreData = buildAvgScoreData(leaderboard);

  return (
    <div className="grid gap-6">

      {/* Score trend over time */}
      {scoreTrend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score trend</CardTitle>
            <p className="text-xs text-muted-foreground">Individual scores per game over time</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={scoreTrend} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip content={<ScoreTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {players.map((p, i) => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.displayName}
                    stroke={color(i)}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Win rate + avg score side by side */}
      <div className="grid sm:grid-cols-2 gap-4">
        {winRateData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Win rate by player</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={winRateData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Win rate']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="Win %" radius={[0, 4, 4, 0]}>
                    {winRateData.map((_, i) => <Cell key={i} fill={color(i)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {avgScoreData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average score by player</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={avgScoreData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Avg score" radius={[0, 4, 4, 0]}>
                    {avgScoreData.map((_, i) => <Cell key={i} fill={color(i)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Corporation plays + win rate */}
      {corpData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Corporation usage</CardTitle>
            <p className="text-xs text-muted-foreground">Top 12 most-played corporations</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={corpData} margin={{ top: 4, right: 8, bottom: 40, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis yAxisId="plays" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="wr" orientation="right" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  formatter={(v: number, name: string) => [name === 'Win %' ? `${v}%` : v, name]}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="plays" dataKey="Plays" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="wr" dataKey="Win %" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Avg TR by player */}
      {avgScoreData.some((r) => r['Avg TR'] > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average terraform rating</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={avgScoreData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="Avg TR" radius={[4, 4, 0, 0]}>
                  {avgScoreData.map((_, i) => <Cell key={i} fill={color(i)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
