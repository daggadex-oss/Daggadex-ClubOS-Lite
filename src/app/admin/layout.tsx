import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Members", href: "/admin/members" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-base">
      <aside className="flex w-56 flex-col border-r border-sage/20 bg-surface">
        <div className="px-4 py-5">
          <span className="font-display text-base uppercase tracking-tight text-cream">
            ClubOS Admin
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-3 py-2 text-sm font-medium text-sage hover:bg-base hover:text-cream"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action="/auth/signout" method="post" className="p-2">
          <button
            type="submit"
            className="w-full rounded-sm px-3 py-2 text-left text-sm text-sage hover:bg-base hover:text-cream"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
