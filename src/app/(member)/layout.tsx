import Link from "next/link";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Menu", href: "/menu" },
  { label: "Requests", href: "/orders" },
  { label: "Account", href: "/account" },
];

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <header className="border-b border-sage/20 px-4 py-4">
        <span className="font-display text-lg uppercase tracking-tight text-cream">
          Daggadex ClubOS
        </span>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-sage/20 bg-surface">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 flex-1 items-center justify-center py-3 text-sm font-medium text-sage hover:text-cream"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
