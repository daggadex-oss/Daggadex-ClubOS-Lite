import { getSessionContext } from "@/lib/session";
import { getAdminProducts } from "@/lib/data/admin-products";
import { ProductEditor } from "@/components/admin/product-editor";

export default async function AdminProductsPage() {
  const session = await getSessionContext();
  if (!session) return null;

  const products = await getAdminProducts(session.club.id);

  return (
    <div>
      <h1 className="font-display text-2xl uppercase tracking-tight text-cream">
        Products
      </h1>
      <p className="mt-1 text-sm text-sage">
        Edit prices, toggle stock, and turn products on or off the live menu.
      </p>
      <div className="mt-4">
        <ProductEditor initialProducts={products} />
      </div>
    </div>
  );
}
