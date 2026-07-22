import { getSessionContext } from "@/lib/session";
import { getMemberOrders } from "@/lib/data/orders";
import { OrderList } from "@/components/order-list";

export default async function OrdersPage() {
  const session = await getSessionContext();
  if (!session) return null;

  const orders = await getMemberOrders(session.member.id);

  return (
    <div>
      <div className="px-4 pt-6">
        <h1 className="font-display text-2xl uppercase tracking-tight text-cream">
          Requests
        </h1>
      </div>
      <OrderList orders={orders} />
    </div>
  );
}
