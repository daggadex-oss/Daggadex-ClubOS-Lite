"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LadderTier, MenuBand, MenuPage, MenuStrain } from "@/lib/data/menu";
import { sellUnitLabel } from "@/lib/sell-unit";
import { formatCents } from "@/lib/money";
import { useBasket } from "@/lib/basket-context";

// Deliberately not gold for I/S/H — docs/design-tokens.md reserves gold for
// scarce CTA/active-state use, and every strain row would have one of these.
const STRAIN_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  indica: { label: "I", className: "bg-olive/20 text-olive" },
  sativa: { label: "S", className: "bg-wood/20 text-wood" },
  hybrid: { label: "H", className: "bg-sage/20 text-sage" },
};

function ladderKey(sellUnit: string, sellQuantity: number): string {
  return `${sellUnit}:${sellQuantity}`;
}

export function MenuBrowser({ pages }: { pages: MenuPage[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    function onScroll() {
      const width = el!.clientWidth || 1;
      setPageIndex(Math.round(el!.scrollLeft / width));
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function goToPage(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(pages.length - 1, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  if (pages.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-sage">
        Nothing here yet — check back soon.
      </p>
    );
  }

  const currentPage = pages[Math.min(pageIndex, pages.length - 1)];

  return (
    // 56px = member layout header (h-14, sticky). 144px = pb-36, the same
    // fixed-bottom-chrome reservation every other member page already
    // uses. Coupled to those two values on purpose — update together.
    <div className="flex h-[calc(100dvh-200px)] flex-col">
      <div className="sticky top-0 z-30 border-b border-sage/20 bg-base/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            aria-label="Previous category"
            className="text-lg text-sage disabled:opacity-30"
          >
            ‹
          </button>
          <div className="flex min-w-0 flex-col items-center">
            <span className="truncate font-display text-base uppercase tracking-tight text-gold">
              {currentPage.title}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-sage">
              Page {pageIndex + 1} / {pages.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={pageIndex === pages.length - 1}
            aria-label="Next category"
            className="text-lg text-sage disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="no-scrollbar mt-2 flex justify-center gap-1 overflow-x-auto">
          {pages.map((page, i) => (
            <button
              key={page.key}
              type="button"
              onClick={() => goToPage(i)}
              aria-label={`Go to ${page.title}`}
              className={`h-0.5 shrink-0 rounded-full transition-all ${
                i === pageIndex ? "w-6 bg-gold" : "w-3 bg-sage/30"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {pages.map((page) => (
          <div
            key={page.key}
            className="h-full w-full flex-shrink-0 snap-start overflow-y-auto"
          >
            {page.bands.map((band) => (
              <BandSection key={band.key} band={band} showLabel={page.bands.length > 1} />
            ))}
            <div className="h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BandSection({ band, showLabel }: { band: MenuBand; showLabel: boolean }) {
  const [selectedTier, setSelectedTier] = useState<LadderTier | null>(band.ladder[0] ?? null);

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-sage/20 bg-base px-4 py-3">
        {showLabel && band.label && (
          <h2 className="mb-2 font-display text-sm uppercase tracking-tight text-sage">
            {band.label}
          </h2>
        )}
        {band.ladder.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {band.ladder.map((tier) => {
              const selected =
                selectedTier?.sellUnit === tier.sellUnit &&
                selectedTier?.sellQuantity === tier.sellQuantity;
              return (
                <button
                  key={ladderKey(tier.sellUnit, tier.sellQuantity)}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`min-w-[72px] flex-1 rounded-sm border py-2 text-center transition-colors ${
                    selected ? "border-gold bg-gold/10 text-gold" : "border-sage/30 text-sage"
                  }`}
                >
                  <div className="text-[10px]">
                    {sellUnitLabel(tier.sellUnit, tier.sellQuantity)}
                  </div>
                  <div className="font-bold">{formatCents(tier.representativePriceCents)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="divide-y divide-sage/10 px-4">
        {band.strains.map((strain) => (
          <StrainRow key={strain.productId} strain={strain} selectedTier={selectedTier} />
        ))}
      </div>
    </div>
  );
}

function StrainRow({
  strain,
  selectedTier,
}: {
  strain: MenuStrain;
  selectedTier: LadderTier | null;
}) {
  const { addLine, lines } = useBasket();

  const offer = selectedTier
    ? strain.offersByLadderKey[ladderKey(selectedTier.sellUnit, selectedTier.sellQuantity)]
    : undefined;
  const badge = strain.strainType ? STRAIN_TYPE_BADGE[strain.strainType] : null;
  const alreadyAdded = offer
    ? lines.some((l) => l.productPriceId === offer.productPriceId)
    : false;
  const isOut = offer?.stockStatus === "out_of_stock";
  const isLow = offer?.stockStatus === "low_stock";
  const disabled = !offer || isOut;

  function handleAdd() {
    if (!offer || !selectedTier) return;
    addLine({
      productPriceId: offer.productPriceId,
      productId: strain.productId,
      productName: strain.name,
      sellUnit: selectedTier.sellUnit,
      sellQuantity: selectedTier.sellQuantity,
      priceCents: offer.priceCents,
    });
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }

  return (
    <div className={`flex items-center justify-between gap-3 py-3 ${isOut ? "opacity-40" : ""}`}>
      <Link href={`/menu/${strain.productId}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {badge && (
            <span
              className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
          <span className="truncate font-medium uppercase tracking-tight text-cream">
            {strain.name}
          </span>
          {strain.isNewDrop && (
            <span className="shrink-0 rounded-sm bg-gold px-1 text-[9px] font-bold uppercase text-base">
              New
            </span>
          )}
        </div>
        {isLow && <p className="mt-0.5 text-[11px] text-gold">Low stock</p>}
        {isOut && <p className="mt-0.5 text-[11px] text-sage">Out of stock</p>}
        {!offer && selectedTier && !isOut && (
          <p className="mt-0.5 text-[11px] text-sage">Not available at this weight</p>
        )}
      </Link>
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        aria-label={alreadyAdded ? `${strain.name} added` : `Add ${strain.name}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg transition-colors ${
          disabled
            ? "border-sage/20 text-sage/30"
            : alreadyAdded
              ? "border-gold text-gold"
              : "border-sage/40 text-sage active:border-gold active:text-gold"
        }`}
      >
        {alreadyAdded ? "✓" : "+"}
      </button>
    </div>
  );
}
