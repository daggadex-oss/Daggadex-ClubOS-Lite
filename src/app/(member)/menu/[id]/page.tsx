import { notFound } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { getMenuProduct } from "@/lib/data/menu";
import { ProductDetail } from "@/components/product-detail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session) return null;

  const product = await getMenuProduct(session.club.id, id);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
