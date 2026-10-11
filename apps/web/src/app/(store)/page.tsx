import Link from "next/link";

const areas = [
  {
    href: "/pos",
    title: "Point of sale",
    body: "Cashier screen for in-store sales, shifts and receipts.",
    status: "Phase 3",
  },
  {
    href: "/admin",
    title: "Back office",
    body: "Products, inventory, purchasing, accounting and reports.",
    status: "Phase 0 ready",
  },
  {
    href: "#",
    title: "Online store",
    body: "Customer catalog, cart and checkout with GCash, Maya, card or COD.",
    status: "Phase 4",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-16 sm:px-6">
      <header className="mb-12 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-brand uppercase">POS &amp; Accounting</span>
        <Link href="/login" className="text-sm font-medium text-muted hover:text-ink">
          Staff sign in
        </Link>
      </header>

      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        One system for the store, the counter and the books.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Online orders and in-store sales draw from one stock pool, and every sale, purchase and stock movement posts
        its own journal entry.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {areas.map((a) => {
          const disabled = a.href === "#";
          const content = (
            <>
              <span className="text-xs font-medium text-muted">{a.status}</span>
              <h2 className="mt-2 text-lg font-semibold">{a.title}</h2>
              <p className="mt-1 text-sm text-muted">{a.body}</p>
            </>
          );
          return disabled ? (
            <div key={a.title} className="rounded-xl border border-dashed border-line p-5 opacity-70">
              {content}
            </div>
          ) : (
            <Link
              key={a.title}
              href={a.href}
              className="rounded-xl border border-line bg-surface p-5 transition-colors hover:border-brand"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
