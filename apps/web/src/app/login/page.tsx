import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm font-semibold tracking-wide text-brand uppercase">
          POS &amp; Accounting
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Staff sign in</h1>
        <p className="mt-1 text-sm text-muted">Use the account your administrator created for you.</p>
        <Card className="mt-6">
          <Suspense fallback={<Skeleton className="h-56" />}>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
