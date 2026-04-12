import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Player {
  id: string;
  displayName: string;
  isGuest: boolean;
  linkedUser: { id: string; displayName: string; avatarUrl: string | null } | null;
  createdBy: { id: string; displayName: string };
}

interface Claim {
  id: string;
  status: string;
  requestingUser: { id: string; displayName: string; email: string };
}

interface Props {
  groupId: string;
  canManage: boolean;
}

export function PlayersTab({ groupId, canManage }: Props) {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const [adding, setAdding] = useState(false);
  const [claimsMap, setClaimsMap] = useState<Record<string, Claim[]>>({});
  const [expandedClaims, setExpandedClaims] = useState<string | null>(null);

  useEffect(() => {
    api.get<Player[]>(`/groups/${groupId}/players`)
      .then(setPlayers)
      .catch(() => toast.error('Failed to load players'))
      .finally(() => setLoading(false));
  }, [groupId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const p = await api.post<Player>(`/groups/${groupId}/players`, {
        displayName: newName.trim(),
        isGuest,
      });
      setPlayers((ps) => [...ps, p].sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setNewName('');
      setIsGuest(false);
      toast.success('Player added');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add player');
    } finally {
      setAdding(false);
    }
  }

  async function handleClaim(playerId: string) {
    try {
      await api.post(`/groups/${groupId}/players/${playerId}/claim`, {});
      toast.success('Claim request submitted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    }
  }

  async function handleRemove(playerId: string, name: string) {
    if (!confirm(`Remove player "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/groups/${groupId}/players/${playerId}`);
      setPlayers((ps) => ps.filter((p) => p.id !== playerId));
      toast.success('Player removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove player');
    }
  }

  async function loadClaims(playerId: string) {
    if (expandedClaims === playerId) { setExpandedClaims(null); return; }
    try {
      const claims = await api.get<Claim[]>(`/groups/${groupId}/players/${playerId}/claims`);
      setClaimsMap((m) => ({ ...m, [playerId]: claims }));
      setExpandedClaims(playerId);
    } catch {
      toast.error('Failed to load claims');
    }
  }

  async function resolveClaim(playerId: string, claimId: string, status: 'approved' | 'rejected') {
    try {
      await api.patch(`/groups/${groupId}/players/${playerId}/claims/${claimId}`, { status });
      setClaimsMap((m) => ({
        ...m,
        [playerId]: (m[playerId] ?? []).map((c) => c.id === claimId ? { ...c, status } : c),
      }));
      if (status === 'approved') {
        const ps = await api.get<Player[]>(`/groups/${groupId}/players`);
        setPlayers(ps);
        setExpandedClaims(null);
      }
      toast.success(status === 'approved' ? 'Claim approved' : 'Claim rejected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve claim');
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading players…</p>;

  return (
    <div className="grid gap-4">
      {/* Add player form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Add player</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Display name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-0 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
            />
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isGuest}
                onChange={(e) => setIsGuest(e.target.checked)}
                className="rounded"
              />
              Guest
            </label>
            <Button type="submit" size="sm" disabled={adding || !newName.trim()}>
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Players list */}
      {players.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No players yet.</p>
      )}

      <div className="grid gap-2">
        {players.map((p) => (
          <div key={p.id} className="border rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                {p.displayName[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {p.isGuest
                    ? 'Guest player'
                    : p.linkedUser
                    ? `Linked to ${p.linkedUser.displayName}`
                    : 'No link'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.isGuest && !p.linkedUser && p.linkedUser === null && user && (
                  <Button size="sm" variant="outline" onClick={() => handleClaim(p.id)}>
                    Claim
                  </Button>
                )}
                {canManage && p.isGuest && (
                  <Button size="sm" variant="ghost" onClick={() => loadClaims(p.id)}>
                    Claims
                  </Button>
                )}
                {canManage && (
                  <button
                    onClick={() => handleRemove(p.id, p.displayName)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Claims panel */}
            {expandedClaims === p.id && claimsMap[p.id] && (
              <div className="mt-3 border-t pt-3 grid gap-2">
                {claimsMap[p.id]!.length === 0 && (
                  <p className="text-xs text-muted-foreground">No claim requests.</p>
                )}
                {claimsMap[p.id]!.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1">{c.requestingUser.displayName} <span className="text-muted-foreground text-xs">({c.requestingUser.email})</span></span>
                    {c.status === 'pending' ? (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => resolveClaim(p.id, c.id, 'approved')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => resolveClaim(p.id, c.id, 'rejected')}>Reject</Button>
                      </div>
                    ) : (
                      <span className={`text-xs capitalize ${c.status === 'approved' ? 'text-green-600' : 'text-muted-foreground'}`}>{c.status}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
