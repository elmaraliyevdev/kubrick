import { Link } from "react-router-dom";

export default function TermsOfUse() {
  return (
    <div className="min-h-svh bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-orange-600 hover:text-orange-700 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Terms of Use</h1>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          These terms govern your use of Kubrick HR. Replace this page with your organization’s
          final legal text before production use.
        </p>
      </div>
    </div>
  );
}
