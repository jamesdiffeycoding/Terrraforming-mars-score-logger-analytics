import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Terraforming Mars Stats</h1>
      <p className="text-muted-foreground">Welcome, {user?.displayName}</p>
      <Button variant="outline" onClick={logout}>Sign out</Button>
    </div>
  );
}
