import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f8f7f4] dark:bg-[#0d1117]">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="/icon.svg" alt="Onlee" className="w-14 h-14" />
          <div className="text-center">
            <h1 className="text-2xl font-bold">Onlee ERP</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your workspace</p>
          </div>
        </div>

        {/* Login form */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>

            {searchParams?.message && (
              <p className="text-sm text-red-500 text-center">
                {searchParams.message}
              </p>
            )}

            <Button type="submit" className="w-full bg-gradient-to-r from-[#FEB800] to-[#FF6100] hover:from-[#FEB800]/90 hover:to-[#FF6100]/90 text-white border-0">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by Onlee Agency
        </p>
      </div>
    </div>
  )
}
