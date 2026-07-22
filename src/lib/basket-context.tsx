"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BasketLine = {
  productPriceId: string;
  productId: string;
  productName: string;
  sellUnit: string;
  sellQuantity: number;
  priceCents: number;
  quantity: number;
};

type BasketContextValue = {
  lines: BasketLine[];
  itemCount: number;
  subtotalCents: number;
  addLine: (line: Omit<BasketLine, "quantity">, quantity?: number) => void;
  updateQuantity: (productPriceId: string, quantity: number) => void;
  removeLine: (productPriceId: string) => void;
  clear: () => void;
};

const BasketContext = createContext<BasketContextValue | null>(null);

// Client state only — nothing here touches the database. The basket is
// lost on a hard refresh, which is fine: there are no DB writes until
// the member actually submits the request.
export function BasketProvider({ children }: { children: ReactNode }) {
  const [linesByPriceId, setLinesByPriceId] = useState<
    Map<string, BasketLine>
  >(new Map());

  const addLine = (line: Omit<BasketLine, "quantity">, quantity = 1) => {
    setLinesByPriceId((prev) => {
      const next = new Map(prev);
      const existing = next.get(line.productPriceId);
      next.set(line.productPriceId, {
        ...line,
        quantity: (existing?.quantity ?? 0) + quantity,
      });
      return next;
    });
  };

  const updateQuantity = (productPriceId: string, quantity: number) => {
    setLinesByPriceId((prev) => {
      const next = new Map(prev);
      if (quantity <= 0) {
        next.delete(productPriceId);
        return next;
      }
      const existing = next.get(productPriceId);
      if (!existing) return prev;
      next.set(productPriceId, { ...existing, quantity });
      return next;
    });
  };

  const removeLine = (productPriceId: string) => {
    setLinesByPriceId((prev) => {
      const next = new Map(prev);
      next.delete(productPriceId);
      return next;
    });
  };

  const clear = () => setLinesByPriceId(new Map());

  const lines = useMemo(
    () => [...linesByPriceId.values()],
    [linesByPriceId],
  );
  const itemCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );
  const subtotalCents = useMemo(
    () => lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),
    [lines],
  );

  return (
    <BasketContext.Provider
      value={{
        lines,
        itemCount,
        subtotalCents,
        addLine,
        updateQuantity,
        removeLine,
        clear,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within BasketProvider");
  return ctx;
}
