import { getSessionContext } from "@/lib/session";
import { getMenuPages } from "@/lib/data/menu";
import { MenuBrowser } from "@/components/menu-browser";

export default async function MenuPage() {
  const session = await getSessionContext();
  if (!session) return null; // middleware already guarantees a session here

  const pages = await getMenuPages(session.club.id);

  return <MenuBrowser pages={pages} />;
}
