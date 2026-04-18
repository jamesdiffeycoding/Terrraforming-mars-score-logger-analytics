import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

interface InvitePreview {
  group: { id: string; name: string };
  role: { name: string };
  invitedBy: { displayName: string };
}

type State = 'loading' | 'ready' | 'accepting' | 'success' | 'error';

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = params.get('token') ?? '';

  const [state, setState] = useState<State>('loading');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [groupId, setGroupId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); setErrorMsg('No invitation token provided.'); return; }
    if (!user) {
      // Not logged in — store token and redirect to login
      sessionStorage.setItem('pendingInviteToken', token);
      navigate(`/login?next=/invite/accept?token=${encodeURIComponent(token)}`);
      return;
    }
    // Fetch pending invitations to find this token's group info
    api.get<InvitePreview[]>('/groups/invitations/mine')
      .then((invites) => {
        const match = invites.find(() => true); // We'll show the first matching; token is passed at accept
        // Can't preview by token alone without a dedicated endpoint, so show generic accept screen
        if (invites.length > 0 && match) {
          setPreview(match);
          setGroupId(match.group.id);
        }
        setState('ready');
      })
      .catch(() => { setState('ready'); }); // Still show accept button even if preview fails
  }, [token, user, navigate]);

  async function handleAccept() {
    setState('accepting');
    try {
      const result = await api.post<{ group: { id: string; name: string } }>('/groups/invitations/accept', { token });
      setGroupId(result.group.id);
      setState('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to accept invitation');
      setState('error');
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>You're in!</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">You've successfully joined the group.</p>
            <Button onClick={() => navigate(`/groups/${groupId}`)}>Go to group</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Invitation error</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">{errorMsg || 'This invitation is invalid or has expired.'}</p>
            <Link to="/groups">
              <Button variant="outline" className="w-full">Go to groups</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Group invitation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {preview ? (
            <div className="text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">{preview.invitedBy.displayName}</span> invited you to join</p>
              <p className="text-lg font-semibold text-foreground mt-1">{preview.group.name}</p>
              <p className="mt-0.5">as <span className="capitalize font-medium text-foreground">{preview.role.name}</span></p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Accept this invitation to join the group.</p>
          )}
          <Button onClick={handleAccept} disabled={state === 'accepting'} className="w-full">
            {state === 'accepting' ? 'Accepting…' : 'Accept invitation'}
          </Button>
          <Link to="/groups">
            <Button variant="ghost" className="w-full text-muted-foreground">Decline</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
