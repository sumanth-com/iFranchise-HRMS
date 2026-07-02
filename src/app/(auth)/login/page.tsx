import { Input } from "@/components/common/input";
import { Button } from "@/components/common/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Authentication will be implemented in a future module.
        </p>
      </div>
      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="admin@example.com" disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" disabled />
        </div>
        <Button type="button" className="w-full" disabled>
          Sign in
        </Button>
      </form>
    </div>
  );
}
