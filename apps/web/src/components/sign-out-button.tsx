"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "./ui";

export function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="ghost"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.replace("/login/");
      }}
    >
      Sign out
    </Button>
  );
}
