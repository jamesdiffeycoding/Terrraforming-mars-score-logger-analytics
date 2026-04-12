import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayersTab } from './PlayersTab';
import { toast } from 'sonner';

interface Member {
  id: string;
  userId: string;
  user: { id: string; displayName: string; email: string; avatarUrl: string | null };
  role: { name: string };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerUserId: string;
  owner: { id: string; displayName: string; email: string };
  _count: { groupMembers: number };
}

const ROLE_OPTIONS = ['admin', 'member', 'viewer'] as const;
type Tab = 'members' | 'players';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);

  const myMembership = members.find((m) => m.userId === user?.id);
  const myRole = myMembership?.role.name ?? 'viewer';
  const canManage = myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Group>(`/groups/${id}`),
      api.get<Member[]>(`/groups/${id}/members`),
    ])
      .then(([g, ms]) => { setGroup(g); setMembers(ms); })
      .catch(() => toast.error('Failed to load group'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await api.post(`/groups/${id}/invite`, { email: inviteEmail, role: inviteRole });
      toast.success(`Invited ${inviteEmail}`);
      setInviteEmail('');
      const ms = await api.get<Member[]>(`/groups/${id}/members`);
      setMembers(ms);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(_memberId: string, userId: string, role: string) {
    try {
      await api.patch(`/groups/${id}/members/${userId}/role`, { role });
      setMembers((ms) => ms.map((m) => m.userId === userId ? { ...m, role: { name: role } } : m));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleRemoveMember(userId: string, displayName: string) {
    if (!confirm(`Remove ${displayName} from this group?`)) return;
    try {
      await api.delete(`/groups/${id}/members/${userId}`);
      setMembers((ms) => ms.filter((m) => m.userId !== userId));
      toast.success(`${displayName} removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  if (loading) return <div className="flex min-h-svh items-center justify-center text-muted-foreground">Loading…</div>;
  if (!group) return <div className="flex min-h-svh items-center justify-center text-muted-foreground">Group not found</div>;

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <Link to="/groups" className="text-sm text-muted-foreground hover:underline">← Groups</Link>
        <h1 className="text-lg font-semibold">{group.name}</h1>
        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full capitalize ml-auto">{myRole}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 grid gap-6">
        {group.description && (
          <p className="text-muted-foreground text-sm">{group.description}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {(['members', 'players'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab === 'members' && (
          <div className="grid gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Members ({members.length})</CardTitle></CardHeader>
              <CardContent className="grid gap-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {m.user.displayName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                    </div>
                    {canManage && m.role.name !== 'owner' && m.userId !== user?.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role.name}
                          onChange={(e) => handleRoleChange(m.id, m.userId, e.target.value)}
                          className="text-xs border rounded px-1.5 py-1 bg-background"
                        >
                          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button
                          onClick={() => handleRemoveMember(m.userId, m.user.displayName)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground capitalize">{m.role.name}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {canManage && (
              <Card>
                <CardHeader><CardTitle className="text-base">Invite member</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleInvite} className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="email@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                      className="border rounded-lg px-2 text-sm bg-background"
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <Button type="submit" size="sm" disabled={inviting}>
                      {inviting ? 'Inviting…' : 'Invite'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Players tab */}
        {tab === 'players' && id && (
          <PlayersTab groupId={id} canManage={canManage} />
        )}
      </main>
    </div>
  );
}
