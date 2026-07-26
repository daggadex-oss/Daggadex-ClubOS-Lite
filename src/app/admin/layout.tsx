"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Members", href: "/admin/members" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  // Close the mobile nav drawer on every route change — otherwise tapping
  // a link leaves the overlay open behind the newly-loaded page.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-base md:flex">
      <div className="flex items-center justify-between border-b border-sage/20 bg-surface px-4 py-3 md:hidden">
        <span className="font-display text-base uppercase tracking-tight text-cream">
          ClubOS Admin
        </span>
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          className="text-cream"
        >
          ☰
        </button>
      </div>

      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col border-r border-sage/20 bg-surface transition-transform duration-300 md:static md:z-auto md:w-56 md:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="hidden px-4 py-5 md:block">
          <span className="font-display text-base uppercase tracking-tight text-cream">
            ClubOS Admin
          </span>
        </div>

        <div className="flex items-center justify-between px-4 py-4 md:hidden">
          <span className="font-display text-base uppercase tracking-tight text-cream">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="text-sage hover:text-cream"
          >
            ✕
          </button>
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

      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-4 md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}
