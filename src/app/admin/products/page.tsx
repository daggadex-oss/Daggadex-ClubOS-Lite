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
      <h1 className="font-display text-2xl uppercase tracking-tight text-cream">
        Products
      </h1>
      <p className="mt-1 text-sm text-sage">
        Edit prices, toggle stock, and turn products on or off the live menu.
      </p>

      <div className="mt-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sage">
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

      <div className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sage">
          Add product
        </h2>
        <div className="mt-2">
          <AddProductForm clubId={session.club.id} options={formOptions} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sage">
          Existing products
        </h2>
        <div className="mt-2">
          <ProductEditor initialProducts={products} />
        </div>
      </div>
    </div>
  );
}
