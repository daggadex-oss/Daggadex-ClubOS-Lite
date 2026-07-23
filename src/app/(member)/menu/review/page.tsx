import { getSessionContext } from "@/lib/session";
import { BasketReview } from "@/components/basket-review";

export default async function BasketReviewPage() {
  const session = await getSessionContext();
  if (!session) return null;

  return <BasketReview minOrderCents={session.club.min_order_cents} />;
}
