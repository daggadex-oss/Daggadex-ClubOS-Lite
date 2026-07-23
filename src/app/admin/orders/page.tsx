import { getSessionContext } from "@/lib/session";
import { getAdminOrders } from "@/lib/data/admin-orders";
import { OrderQueue } from "@/components/admin/order-queue";

export default async function AdminOrdersPage() {
  const session = await getSessionContext();
  if (!session) return null;

  const orders = await getAdminOrders(session.club.id);

  return (
    <div className="-mx-6 -my-6">
      <div className="px-6 pt-6">
        <h1 className="font-display text-2xl uppercase tracking-tight text-cream">
          Orders
        </h1>
      </div>
      <OrderQueue initialOrders={orders} clubId={session.club.id} />
    </div>
  );
}
