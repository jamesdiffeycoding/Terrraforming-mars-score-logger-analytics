import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Board { id: string; name: string }
interface ExpansionSet { id: string; name: string }
interface Corporation { id: string; name: string; expansionSet: { name: string } | null }
interface Player { id: string; displayName: string }

interface GamePlayer {
  id: string;
  player: { id: string; displayName: string };
  corporation: { id: string; name: string } | null;
  score: number | null;
  placement: number | null;
  terraformRating: number | null;
  isWinner: boolean;
}

interface Game {
  id: string;
  playedAt: string;
  notes: string | null;
  board: { name: string };
  winner: { id: string; displayName: string } | null;
  gamePlayers: GamePlayer[];
  gameExpansionSets: { expansionSet: { name: string } }[];
}

// ── Record game form state ─────────────────────────────────────────────────────

interface FormPlayer {
  playerId: string;
  corporationId: string;
  score: string;
  terraformRating: string;
  placement: string;
  isWinner: boolean;
}

const defaultFormPlayer = (): FormPlayer => ({
  playerId: '',
  corporationId: '',
  score: '',
  terraformRating: '',
  placement: '',
  isWinner: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

// ── RecordGameDialog ───────────────────────────────────────────────────────────

interface RecordGameDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  players: Player[];
  boards: Board[];
  expansionSets: ExpansionSet[];
  corporations: Corporation[];
  onCreated: (game: Game) => void;
}

function RecordGameDialog({
  open, onClose, groupId, players, boards, expansionSets, corporations, onCreated,
}: RecordGameDialogProps) {
  const [boardId, setBoardId] = useState('');
  const [playedAt, setPlayedAt] = useState(todayIso);
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [formPlayers, setFormPlayers] = useState<FormPlayer[]>([defaultFormPlayer()]);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setBoardId('');
    setPlayedAt(todayIso());
    setSelectedExpansions([]);
    setNotes('');
    setFormPlayers([defaultFormPlayer()]);
  }

  function toggleExpansion(id: string) {
    setSelectedExpansions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function updatePlayer(idx: number, patch: Partial<FormPlayer>) {
    setFormPlayers((ps) => ps.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }

  function setWinner(idx: number) {
    setFormPlayers((ps) => ps.map((p, i) => ({ ...p, isWinner: i === idx })));
  }

  function addPlayer() {
    setFormPlayers((ps) => [...ps, defaultFormPlayer()]);
  }

  function removePlayer(idx: number) {
    setFormPlayers((ps) => ps.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!boardId) { toast.error('Select a board'); return; }
    if (formPlayers.some((p) => !p.playerId)) { toast.error('Select a player for each row'); return; }

    setSaving(true);
    try {
      const game = await api.post<Game>(`/groups/${groupId}/games`, {
        boardId,
        playedAt: new Date(playedAt).toISOString(),
        expansionSetIds: selectedExpansions,
        notes: notes || undefined,
        players: formPlayers.map((p, i) => ({
          playerId: p.playerId,
          corporationId: p.corporationId || undefined,
          score: p.score !== '' ? Number(p.score) : undefined,
          terraformRating: p.terraformRating !== '' ? Number(p.terraformRating) : undefined,
          placement: p.placement !== '' ? Number(p.placement) : i + 1,
          isWinner: p.isWinner,
        })),
      });
      toast.success('Game recorded');
      onCreated(game);
      resetForm();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record game');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record game</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-5 mt-2">
          {/* Board + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Board</label>
              <select
                required
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="h-9 rounded-lg border px-2 text-sm bg-background"
              >
                <option value="">Select board…</option>
                {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Played on</label>
              <input
                type="date"
                required
                value={playedAt}
                onChange={(e) => setPlayedAt(e.target.value)}
                className="h-9 rounded-lg border px-2 text-sm bg-background"
              />
            </div>
          </div>

          {/* Expansions */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Expansions used</label>
            <div className="flex flex-wrap gap-2">
              {expansionSets.map((ex) => (
                <label key={ex.id} className="flex items-center gap-1.5 text-sm cursor-pointer border rounded px-2 py-1 select-none hover:bg-muted transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedExpansions.includes(ex.id)}
                    onChange={() => toggleExpansion(ex.id)}
                  />
                  {ex.name}
                </label>
              ))}
            </div>
          </div>

          {/* Players */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Players</label>
              <Button type="button" size="sm" variant="outline" onClick={addPlayer}>+ Add player</Button>
            </div>

            <div className="grid gap-2">
              {formPlayers.map((fp, idx) => (
                <div key={idx} className="border rounded-lg p-3 grid gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      required
                      value={fp.playerId}
                      onChange={(e) => updatePlayer(idx, { playerId: e.target.value })}
                      className="flex-1 h-8 rounded border px-2 text-sm bg-background"
                    >
                      <option value="">Player…</option>
                      {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                    </select>

                    <select
                      value={fp.corporationId}
                      onChange={(e) => updatePlayer(idx, { corporationId: e.target.value })}
                      className="flex-1 h-8 rounded border px-2 text-sm bg-background"
                    >
                      <option value="">Corporation…</option>
                      {corporations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.expansionSet ? ` (${c.expansionSet.name})` : ''}
                        </option>
                      ))}
                    </select>

                    {formPlayers.length > 1 && (
                      <button type="button" onClick={() => removePlayer(idx)} className="text-xs text-destructive hover:underline shrink-0">
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="grid gap-1">
                      <label className="text-xs text-muted-foreground">Score</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="–"
                        value={fp.score}
                        onChange={(e) => updatePlayer(idx, { score: e.target.value })}
                        className="h-8 rounded border px-2 text-sm bg-background"
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs text-muted-foreground">TR</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="–"
                        value={fp.terraformRating}
                        onChange={(e) => updatePlayer(idx, { terraformRating: e.target.value })}
                        className="h-8 rounded border px-2 text-sm bg-background"
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs text-muted-foreground">Place</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="–"
                        value={fp.placement}
                        onChange={(e) => updatePlayer(idx, { placement: e.target.value })}
                        className="h-8 rounded border px-2 text-sm bg-background"
                      />
                    </div>
                    <div className="grid gap-1 items-end">
                      <label className="text-xs text-muted-foreground">Winner</label>
                      <label className="flex items-center gap-1.5 h-8 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name="winner"
                          checked={fp.isWinner}
                          onChange={() => setWinner(idx)}
                        />
                        Yes
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this game…"
              className="rounded-lg border px-3 py-2 text-sm resize-none outline-none focus-visible:ring-2 bg-background"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Record game'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── GamesTab ──────────────────────────────────────────────────────────────────

interface Props {
  groupId: string;
}

export function GamesTab({ groupId }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [expansionSets, setExpansionSets] = useState<ExpansionSet[]>([]);
  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Game[]>(`/groups/${groupId}/games`),
      api.get<Player[]>(`/groups/${groupId}/players`),
      api.get<Board[]>('/boards'),
      api.get<ExpansionSet[]>('/expansion-sets'),
      api.get<Corporation[]>('/corporations'),
    ])
      .then(([g, pl, b, ex, corp]) => {
        setGames(g);
        setPlayers(pl);
        setBoards(b);
        setExpansionSets(ex);
        setCorporations(corp);
      })
      .catch(() => toast.error('Failed to load games data'))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <p className="text-sm text-muted-foreground">Loading games…</p>;

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>Record game</Button>
      </div>

      {games.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No games recorded yet.</p>
      )}

      <div className="grid gap-3">
        {games.map((g) => (
          <Card key={g.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold">{g.board.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{formatDate(g.playedAt)}</p>
                </div>
                {g.winner && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium shrink-0">
                    Winner: {g.winner.displayName}
                  </span>
                )}
              </div>
              {g.gameExpansionSets.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {g.gameExpansionSets.map((e) => e.expansionSet.name).join(', ')}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-1.5">
                {g.gamePlayers.map((gp) => (
                  <div key={gp.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 text-center text-xs font-mono font-medium ${gp.isWinner ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      {gp.placement ?? '–'}
                    </div>
                    <span className={`font-medium flex-1 min-w-0 truncate ${gp.isWinner ? 'text-foreground' : ''}`}>
                      {gp.player.displayName}
                    </span>
                    {gp.corporation && (
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">{gp.corporation.name}</span>
                    )}
                    <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
                      {gp.score != null && (
                        <span><span className="text-muted-foreground">Score </span>{gp.score}</span>
                      )}
                      {gp.terraformRating != null && (
                        <span><span className="text-muted-foreground">TR </span>{gp.terraformRating}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {g.notes && (
                <p className="text-xs text-muted-foreground mt-3 border-t pt-2">{g.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <RecordGameDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        groupId={groupId}
        players={players}
        boards={boards}
        expansionSets={expansionSets}
        corporations={corporations}
        onCreated={(game) => setGames((gs) => [game, ...gs])}
      />
    </div>
  );
}
