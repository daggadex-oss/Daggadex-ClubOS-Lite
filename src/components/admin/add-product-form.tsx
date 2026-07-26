"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductFormOptions } from "@/lib/data/admin-products";
import { createProduct, type CreateProductPricePoint } from "@/lib/actions/admin-products";
import { sellUnitLabel } from "@/lib/sell-unit";

const CULTIVATION_OPTIONS = [
  "indoor",
  "light_assisted_greenhouse",
  "greenhouse",
  "outdoor",
] as const;

const POTENCY_UNIT_OPTIONS = ["mg", "percent"] as const;
const POTENCY_COMPOUND_OPTIONS = [
  "thc",
  "cbd",
  "cbg",
  "cbn",
  "psilocybin",
  "blend",
] as const;
const POTENCY_BASIS_OPTIONS = ["per_serving", "per_package", "concentration"] as const;
const SELL_UNIT_OPTIONS = ["gram", "joint", "device", "pack", "each", "ml"] as const;

type PriceRow = {
  key: number;
  sellUnit: string;
  sellQuantity: string;
  priceRand: string;
};

let rowKeySeq = 0;
function emptyPriceRow(): PriceRow {
  return { key: rowKeySeq++, sellUnit: "gram", sellQuantity: "", priceRand: "" };
}

const fieldClass =
  "w-full rounded-sm border border-sage/30 bg-base px-2 py-1 text-sm text-cream";
const labelClass = "block text-xs text-sage mb-1";

export function AddProductForm({
  clubId,
  options,
}: {
  clubId: string;
  options: ProductFormOptions;
}) {
  const router = useRouter();

  const [productTypeCode, setProductTypeCode] = useState("");
  const [name, setName] = useState("");
  const [varietyId, setVarietyId] = useState("");
  const [clubTierId, setClubTierId] = useState("");
  const [cultivation, setCultivation] = useState("");
  const [gradeDeclared, setGradeDeclared] = useState("");
  const [potencyAmount, setPotencyAmount] = useState("");
  const [potencyUnit, setPotencyUnit] = useState("");
  const [potencyCompound, setPotencyCompound] = useState("");
  const [potencyBasis, setPotencyBasis] = useState("");
  const [baseUnitPriceRand, setBaseUnitPriceRand] = useState("");
  const [attributeValues, setAttributeValues] = useState<
    Record<string, string | boolean | string[]>
  >({});
  const [prices, setPrices] = useState<PriceRow[]>([emptyPriceRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  const selectedVariety = useMemo(
    () => options.varieties.find((v) => v.id === varietyId) ?? null,
    [options.varieties, varietyId],
  );

  const typeAttributeSchemas = useMemo(
    () => options.attributeSchemas.filter((s) => s.product_type_code === productTypeCode),
    [options.attributeSchemas, productTypeCode],
  );

  const baseUnitPriceCents = baseUnitPriceRand
    ? Math.round(parseFloat(baseUnitPriceRand) * 100)
    : null;

  function updatePriceRow(key: number, patch: Partial<PriceRow>) {
    setPrices((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addPriceRow() {
    setPrices((prev) => [...prev, emptyPriceRow()]);
  }

  function removePriceRow(key: number) {
    setPrices((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev));
  }

  function discountForRow(row: PriceRow): number | null {
    const qty = parseFloat(row.sellQuantity);
    const rand = parseFloat(row.priceRand);
    if (!baseUnitPriceCents || !qty || Number.isNaN(rand)) return null;
    const priceCents = Math.round(rand * 100);
    const pricePerUnitCents = priceCents / qty;
    return Math.round((1 - pricePerUnitCents / baseUnitPriceCents) * 1000) / 10;
  }

  function resetForm() {
    setProductTypeCode("");
    setName("");
    setVarietyId("");
    setClubTierId("");
    setCultivation("");
    setGradeDeclared("");
    setPotencyAmount("");
    setPotencyUnit("");
    setPotencyCompound("");
    setPotencyBasis("");
    setBaseUnitPriceRand("");
    setAttributeValues({});
    setPrices([emptyPriceRow()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (!productTypeCode || !name.trim()) {
      setStatus({ kind: "error", message: "Product type and name are required." });
      return;
    }

    const parsedPrices: CreateProductPricePoint[] = [];
    for (const row of prices) {
      const qty = parseFloat(row.sellQuantity);
      const rand = parseFloat(row.priceRand);
      if (!row.sellQuantity || Number.isNaN(qty) || qty <= 0) {
        setStatus({ kind: "error", message: "Every price point needs a quantity greater than 0." });
        return;
      }
      if (!row.priceRand || Number.isNaN(rand) || rand < 0) {
        setStatus({ kind: "error", message: "Every price point needs a valid price." });
        return;
      }
      parsedPrices.push({
        sellUnit: row.sellUnit,
        sellQuantity: qty,
        priceCents: Math.round(rand * 100),
      });
    }

    setSubmitting(true);
    const result = await createProduct({
      clubId,
      productTypeCode,
      name: name.trim(),
      varietyId: varietyId || null,
      clubTierId: clubTierId || null,
      cultivation: cultivation || null,
      gradeDeclared: gradeDeclared.trim() || null,
      potencyAmount: potencyAmount ? parseFloat(potencyAmount) : null,
      potencyUnit: potencyUnit || null,
      potencyCompound: potencyCompound || null,
      potencyBasis: potencyBasis || null,
      baseUnitPriceCents,
      attributes: attributeValues,
      prices: parsedPrices,
    });
    setSubmitting(false);

    if ("error" in result) {
      setStatus({ kind: "error", message: result.error });
      return;
    }

    setStatus({ kind: "success", message: `"${name.trim()}" added.` });
    resetForm();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-sm border border-sage/20 bg-surface p-4 space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Product type *</label>
          <select
            required
            value={productTypeCode}
            onChange={(e) => setProductTypeCode(e.target.value)}
            className={fieldClass}
          >
            <option value="">— Select —</option>
            {options.productTypes.map((pt) => (
              <option key={pt.code} value={pt.code}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name on the menu"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Strain</label>
        <select
          value={varietyId}
          onChange={(e) => setVarietyId(e.target.value)}
          className={fieldClass}
        >
          <option value="">— No strain (non-flower item) —</option>
          {options.varieties.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        {selectedVariety?.strain_type && (
          <p className="mt-1 text-xs text-sage">Strain type: {selectedVariety.strain_type}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Cultivation</label>
          <select
            value={cultivation}
            onChange={(e) => setCultivation(e.target.value)}
            className={fieldClass}
          >
            <option value="">— None —</option>
            {CULTIVATION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Grade declared</label>
          <input
            value={gradeDeclared}
            onChange={(e) => setGradeDeclared(e.target.value)}
            placeholder="e.g. A-grade"
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <p className={labelClass}>Potency</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            type="number"
            step="0.001"
            min="0"
            value={potencyAmount}
            onChange={(e) => setPotencyAmount(e.target.value)}
            placeholder="Amount"
            className={fieldClass}
          />
          <select
            value={potencyUnit}
            onChange={(e) => setPotencyUnit(e.target.value)}
            className={fieldClass}
          >
            <option value="">Unit</option>
            {POTENCY_UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <select
            value={potencyCompound}
            onChange={(e) => setPotencyCompound(e.target.value)}
            className={fieldClass}
          >
            <option value="">Compound</option>
            {POTENCY_COMPOUND_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={potencyBasis}
            onChange={(e) => setPotencyBasis(e.target.value)}
            className={fieldClass}
          >
            <option value="">Basis</option>
            {POTENCY_BASIS_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Club tier</label>
        <select
          value={clubTierId}
          onChange={(e) => setClubTierId(e.target.value)}
          className={fieldClass}
        >
          <option value="">— No tier —</option>
          {options.clubTiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {typeAttributeSchemas.length > 0 && (
        <div className="space-y-2 border-t border-sage/20 pt-3">
          <p className={labelClass}>
            {options.productTypes.find((pt) => pt.code === productTypeCode)?.name} details
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {typeAttributeSchemas.map((schema) => (
              <div key={schema.id}>
                <label className={labelClass}>{schema.label}</label>
                {schema.input_type === "boolean" ? (
                  <label className="flex items-center gap-1.5 text-xs text-sage">
                    <input
                      type="checkbox"
                      checked={Boolean(attributeValues[schema.attribute_key])}
                      onChange={(e) =>
                        setAttributeValues((prev) => ({
                          ...prev,
                          [schema.attribute_key]: e.target.checked,
                        }))
                      }
                    />
                    {schema.label}
                  </label>
                ) : schema.input_type === "select" ? (
                  <select
                    value={(attributeValues[schema.attribute_key] as string) ?? ""}
                    onChange={(e) =>
                      setAttributeValues((prev) => ({
                        ...prev,
                        [schema.attribute_key]: e.target.value,
                      }))
                    }
                    className={fieldClass}
                  >
                    <option value="">— Select —</option>
                    {(schema.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : schema.input_type === "multiselect" ? (
                  <div className="flex flex-wrap gap-2">
                    {(schema.options ?? []).map((opt) => {
                      const current = attributeValues[schema.attribute_key];
                      const selected = Array.isArray(current) ? current : [];
                      const checked = selected.includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-1 text-xs text-sage">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selected, opt]
                                : selected.filter((v) => v !== opt);
                              setAttributeValues((prev) => ({
                                ...prev,
                                [schema.attribute_key]: next,
                              }));
                            }}
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type={schema.input_type === "number" ? "number" : "text"}
                    min={schema.input_type === "number" ? "0" : undefined}
                    value={(attributeValues[schema.attribute_key] as string) ?? ""}
                    onChange={(e) =>
                      setAttributeValues((prev) => ({
                        ...prev,
                        [schema.attribute_key]: e.target.value,
                      }))
                    }
                    className={fieldClass}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-sage/20 pt-3">
        <label className={labelClass}>
          Base unit price (R per single unit — e.g. per gram)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={baseUnitPriceRand}
          onChange={(e) => setBaseUnitPriceRand(e.target.value)}
          placeholder="150.00"
          className={`${fieldClass} max-w-40`}
        />
        <p className="mt-1 text-xs text-sage">
          Optional reference rate — package price points below show their live discount
          against it.
        </p>
      </div>

      <div className="space-y-2">
        <p className={labelClass}>Price points *</p>
        {prices.map((row) => {
          const discount = discountForRow(row);
          return (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <select
                value={row.sellUnit}
                onChange={(e) => updatePriceRow(row.key, { sellUnit: e.target.value })}
                className={`${fieldClass} w-28`}
              >
                {SELL_UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={row.sellQuantity}
                onChange={(e) => updatePriceRow(row.key, { sellQuantity: e.target.value })}
                placeholder="Qty"
                className={`${fieldClass} w-20`}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={row.priceRand}
                onChange={(e) => updatePriceRow(row.key, { priceRand: e.target.value })}
                placeholder="R price"
                className={`${fieldClass} w-24`}
              />
              {row.sellUnit && row.sellQuantity && (
                <span className="text-xs text-sage">
                  {sellUnitLabel(row.sellUnit, parseFloat(row.sellQuantity) || 0)}
                </span>
              )}
              {discount !== null && (
                <span className={discount >= 0 ? "text-xs text-gold" : "text-xs text-wood"}>
                  {discount >= 0
                    ? `${discount}% off base`
                    : `${Math.abs(discount)}% above base`}
                </span>
              )}
              <button
                type="button"
                onClick={() => removePriceRow(row.key)}
                disabled={prices.length === 1}
                className="text-xs text-sage disabled:opacity-30"
              >
                Remove
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addPriceRow}
          className="text-xs text-gold underline underline-offset-2"
        >
          + Add price point
        </button>
      </div>

      <div className="flex items-center gap-3 border-t border-sage/20 pt-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-sm bg-gold px-4 py-1.5 text-sm font-medium text-base disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add product"}
        </button>
        {status && (
          <span className={`text-xs ${status.kind === "error" ? "text-wood" : "text-sage"}`}>
            {status.message}
          </span>
        )}
      </div>
    </form>
  );
}
