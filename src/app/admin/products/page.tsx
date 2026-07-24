import { getSessionContext } from "@/lib/session";
import { getAdminProducts, getProductFormOptions } from "@/lib/data/admin-products";
import { ProductEditor } from "@/components/admin/product-editor";
import { AddProductForm } from "@/components/admin/add-product-form";

export default async function AdminProductsPage() {
  const session = await getSessionContext();
  if (!session) return null;

  const [products, formOptions] = await Promise.all([
    getAdminProducts(session.club.id),
    getProductFormOptions(session.club.id),
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
