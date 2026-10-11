import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui";

export const metadata: Metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight">You don&apos;t have access to that page</h1>
        <p className="mt-2 text-sm text-muted">
          Your role doesn&apos;t include this area. Ask the owner or an admin to change your role if you need it.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm font-medium hover:bg-surface-2"
          >
            Home
          </Link>
          <form action={signOut}>
            <Button variant="ghost">Sign out</Button>
          </form>
        </div>
      </div>
    </main>
  );
}
