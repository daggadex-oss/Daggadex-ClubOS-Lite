import { getSessionContext } from "@/lib/session";
import { getMenuSections } from "@/lib/data/menu";
import { MenuBrowser } from "@/components/menu-browser";

export default async function MenuPage() {
  const session = await getSessionContext();
  if (!session) return null; // middleware already guarantees a session here

  const sections = await getMenuSections(session.club.id);

  return <MenuBrowser sections={sections} />;
}
