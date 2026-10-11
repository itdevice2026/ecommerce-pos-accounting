import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Company setup" };

export default function SetupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <span className="text-sm font-semibold tracking-wide text-brand uppercase">First-run setup</span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Set up your company</h1>
        <p className="mt-1 text-sm text-muted">
          You&apos;re signed in but not linked to a company yet. Create it here to start using the system.
        </p>
        <Card className="mt-6">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <SetupGate />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}

async function SetupGate() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/setup");
  if (user.role) redirect("/admin");
  return <SetupForm />;
}
