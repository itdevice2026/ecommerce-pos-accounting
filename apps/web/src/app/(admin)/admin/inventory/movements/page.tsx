"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { MovementsView } from "./movements-view";

export default function MovementsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-6xl" />}>
      <MovementsView />
    </Suspense>
  );
}
