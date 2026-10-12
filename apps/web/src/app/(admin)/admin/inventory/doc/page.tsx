"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { StockDocEditor } from "./stock-doc-editor";

// One static page for new (?type=…) and existing (?id=…) stock documents.
export default function StockDocPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-5xl" />}>
      <StockDocEditor />
    </Suspense>
  );
}
