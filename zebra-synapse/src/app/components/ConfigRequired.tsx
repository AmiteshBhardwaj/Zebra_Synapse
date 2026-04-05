import { Link } from "react-router";

/** Shown when VITE_SUPABASE_* env vars are not set or DB profile is missing. */
export function ConfigRequired() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-lg font-medium mb-2">Supabase not configured</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Add{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            VITE_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            VITE_SUPABASE_ANON_KEY
          </code>{" "}
          to a <code className="text-xs">.env</code> file in the project root,
          then restart the dev server. Copy{" "}
          <code className="text-xs">.env.example</code> as a starting point.
        </p>
        <Link
          to="/"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export function ProfileMissing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        <h1 className="text-lg font-medium mb-2">Profile not found</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Your account exists but there is no row in{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">profiles</code>
          . Run the SQL in{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            supabase/migrations/001_profiles.sql
          </code>{" "}
          in the Supabase SQL Editor, then sign up again (or contact support).
        </p>
        <Link
          to="/"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
