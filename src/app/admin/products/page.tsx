import { getSessionContext } from "@/lib/session";
import { getAdminProducts, getProductFormOptions } from "@/lib/data/admin-products";
import { getClubTiers } from "@/lib/data/admin-tiers";
import { ProductEditor } from "@/components/admin/product-editor";
import { AddProductForm } from "@/components/admin/add-product-form";
import { ClubTiersEditor } from "@/components/admin/club-tiers-editor";

export default async function AdminProductsPage() {
  const session = await getSessionContext();
  if (!session) return null;

  const [products, formOptions, clubTiers] = await Promise.all([
    getAdminProducts(session.club.id),
    getProductFormOptions(session.club.id),
    getClubTiers(session.club.id),
  ]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-tight text-cream leading-none">
            Product Inventory
          </h1>
          <p className="mt-2 text-sm text-sage">
            Manage your current cultivation batches and price points.
          </p>
        </div>
        <AddProductForm clubId={session.club.id} options={formOptions} />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xs uppercase tracking-wide text-sage">
          Club tiers
        </h2>
        <p className="mt-1 text-xs text-sage">
          Your club&apos;s own merchandising tiers (e.g. &quot;Legendary&quot;,
          &quot;Light Assisted&quot;) — rank controls display order, lower shows first.
        </p>
        <div className="mt-2">
          <ClubTiersEditor clubId={session.club.id} initialTiers={clubTiers} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xs uppercase tracking-wide text-sage">
          Existing products
        </h2>
        <div className="mt-2">
          {/* keyed by count so a product added elsewhere on this page (Add
              Product form triggers router.refresh(), not a mutation this
              component makes itself) forces a remount and actually shows
              up here, instead of staying stuck at this component's first
              useState(initialProducts) snapshot */}
          <ProductEditor key={products.length} initialProducts={products} />
        </div>
      </div>
    </div>
  );
}
