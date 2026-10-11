"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { ProductForm } from "./product-form";

// One static page for both "new" (/admin/products/edit/) and "edit"
// (/admin/products/edit/?id=…); a static export can't have /products/[id].
export default function EditProductPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl" />}>
      <ProductForm />
    </Suspense>
  );
}
