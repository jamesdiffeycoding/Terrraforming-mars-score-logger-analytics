import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  description: string | null;
  _count: { groupMembers: number };
  groupMembers: { role: { name: string } }[];
}

export function GroupsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Group[]>('/groups')
      .then(setGroups)
      .catch(() => toast.error('Failed to load groups'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Terraforming Mars Stats</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.displayName}</span>
          <Button variant="outline" size="sm" onClick={logout}>Sign out</Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Your groups</h2>
          <Button onClick={() => navigate('/groups/new')}>Create group</Button>
        </div>

        {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

        {!loading && groups.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">You're not in any groups yet.</p>
            <Button onClick={() => navigate('/groups/new')}>Create your first group</Button>
          </div>
        )}

        <div className="grid gap-3">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{g.name}</CardTitle>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full capitalize">
                      {g.groupMembers[0]?.role.name}
                    </span>
                  </div>
                  {g.description && <CardDescription>{g.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{g._count.groupMembers} member{g._count.groupMembers !== 1 ? 's' : ''}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
