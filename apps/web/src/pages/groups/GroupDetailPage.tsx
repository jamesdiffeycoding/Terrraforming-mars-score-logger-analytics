import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayersTab } from './PlayersTab';
import { GamesTab } from './GamesTab';
import { StatsTab } from './StatsTab';
import { AnalyticsTab } from './AnalyticsTab';
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

interface PendingTransfer {
  id: string;
  fromUser: { id: string; displayName: string };
  toUser: { id: string; displayName: string };
  expiresAt: string;
}

const ROLE_OPTIONS = ['admin', 'member', 'viewer'] as const;
type Tab = 'members' | 'players' | 'games' | 'stats' | 'analytics';

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
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferring, setTransferring] = useState(false);

  const myMembership = members.find((m) => m.userId === user?.id);
  const myRole = myMembership?.role.name ?? 'viewer';
  const canManage = myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Group>(`/groups/${id}`),
      api.get<Member[]>(`/groups/${id}/members`),
      api.get<PendingTransfer | null>(`/groups/${id}/ownership-transfer`).catch(() => null),
    ])
      .then(([g, ms, transfer]) => { setGroup(g); setMembers(ms); setPendingTransfer(transfer); })
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

  async function handleInitiateTransfer() {
    if (!transferTargetId) { toast.error('Select a member to transfer to'); return; }
    if (!confirm('Initiate ownership transfer? The selected member will need to accept.')) return;
    setTransferring(true);
    try {
      const t = await api.post<PendingTransfer>(`/groups/${id}/ownership-transfer`, { toUserId: transferTargetId });
      setPendingTransfer(t);
      setTransferTargetId('');
      toast.success('Transfer initiated — waiting for acceptance');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate transfer');
    } finally {
      setTransferring(false);
    }
  }

  async function handleCancelTransfer() {
    if (!pendingTransfer) return;
    try {
      await api.delete(`/groups/${id}/ownership-transfer/${pendingTransfer.id}`);
      setPendingTransfer(null);
      toast.success('Transfer cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel transfer');
    }
  }

  async function handleRespondToTransfer(accept: boolean) {
    if (!pendingTransfer) return;
    const verb = accept ? 'accept' : 'reject';
    try {
      await api.post(`/groups/${id}/ownership-transfer/${pendingTransfer.id}/${verb}`, {});
      if (accept) {
        toast.success('You are now the group owner');
        // Refresh page state
        const [g, ms] = await Promise.all([
          api.get<Group>(`/groups/${id}`),
          api.get<Member[]>(`/groups/${id}/members`),
        ]);
        setGroup(g); setMembers(ms);
      } else {
        toast.success('Transfer rejected');
      }
      setPendingTransfer(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${verb} transfer`);
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
          {(['members', 'players', 'games', 'stats', 'analytics'] as Tab[]).map((t) => (
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

            {/* Pending transfer banner — shown to the recipient */}
            {pendingTransfer && pendingTransfer.toUser.id === user?.id && (
              <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-yellow-800 dark:text-yellow-400">Ownership transfer pending</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    <span className="font-medium">{pendingTransfer.fromUser.displayName}</span> wants to transfer group ownership to you.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRespondToTransfer(true)}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => handleRespondToTransfer(false)}>Decline</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transfer ownership — shown to owner */}
            {myRole === 'owner' && (
              <Card>
                <CardHeader><CardTitle className="text-base">Transfer ownership</CardTitle></CardHeader>
                <CardContent className="grid gap-3">
                  {pendingTransfer && pendingTransfer.fromUser.id === user?.id ? (
                    <div className="grid gap-2">
                      <p className="text-sm text-muted-foreground">
                        Waiting for <span className="font-medium text-foreground">{pendingTransfer.toUser.displayName}</span> to accept.
                      </p>
                      <Button size="sm" variant="outline" onClick={handleCancelTransfer}>Cancel transfer</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={transferTargetId}
                        onChange={(e) => setTransferTargetId(e.target.value)}
                        className="flex-1 h-9 rounded-lg border px-2 text-sm bg-background"
                      >
                        <option value="">Select new owner…</option>
                        {members.filter((m) => m.userId !== user?.id).map((m) => (
                          <option key={m.userId} value={m.userId}>{m.user.displayName}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="destructive" disabled={!transferTargetId || transferring} onClick={handleInitiateTransfer}>
                        {transferring ? 'Sending…' : 'Transfer'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Players tab */}
        {tab === 'players' && id && (
          <PlayersTab groupId={id} canManage={canManage} />
        )}

        {/* Games tab */}
        {tab === 'games' && id && (
          <GamesTab groupId={id} />
        )}

        {/* Stats tab */}
        {tab === 'stats' && id && (
          <StatsTab groupId={id} />
        )}

        {/* Analytics tab */}
        {tab === 'analytics' && id && (
          <AnalyticsTab groupId={id} />
        )}
      </main>
    </div>
  );
}
