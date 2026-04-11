import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function CreateGroupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) { toast.error('Name must be at least 2 characters'); return; }
    setSubmitting(true);
    try {
      const group = await api.post<{ id: string }>('/groups', { name: name.trim(), description: description.trim() || undefined });
      toast.success('Group created!');
      navigate(`/groups/${group.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="name">Group name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Friday Night Mars"
                className="h-9 w-full rounded-lg border px-3 py-1 text-sm outline-none focus-visible:ring-2"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Our weekly Terraforming Mars group"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Link to="/groups">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create group'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
