import Link from "next/link";
import type { ReactNode } from "react";
import { BasketProvider } from "@/lib/basket-context";
import { BasketBar } from "@/components/basket-bar";
import { getSessionContext } from "@/lib/session";

const NAV_ITEMS = [
  { label: "Menu", href: "/menu" },
  { label: "Requests", href: "/orders" },
  { label: "Account", href: "/account" },
];

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const session = await getSessionContext();
  const initial = session?.member.alias?.trim().charAt(0).toUpperCase();

  return (
    <BasketProvider>
      <div className="flex min-h-screen flex-col bg-base">
        {/* h-14 (56px) is relied on by menu-browser.tsx's viewport height
            calc — update both together if this changes. */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-sage/20 bg-base px-4">
          <span className="font-display text-lg uppercase tracking-tight text-cream">
            Daggadex ClubOS
          </span>
          {initial && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sage/30 bg-surface font-display text-sm text-cream">
              {initial}
            </span>
          )}
        </header>

        <main className="flex-1 pb-36">{children}</main>

        <div className="fixed inset-x-0 bottom-0">
          <BasketBar />
          <nav className="flex border-t border-sage/20 bg-surface">
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
      </div>
    </BasketProvider>
  );
}
