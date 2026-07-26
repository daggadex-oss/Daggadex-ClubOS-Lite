"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminClubTier } from "@/lib/data/admin-tiers";
import { createClubTier, updateClubTier, deleteClubTier } from "@/lib/actions/admin-tiers";

const fieldClass =
  "rounded-sm border-none bg-base px-2.5 py-1.5 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-gold";

function nextRank(list: AdminClubTier[]): number {
  return list.length ? Math.max(...list.map((t) => t.rank)) + 1 : 1;
}

export function ClubTiersEditor({
  clubId,
  initialTiers,
}: {
  clubId: string;
  initialTiers: AdminClubTier[];
}) {
  const router = useRouter();
  const [tiers, setTiers] = useState(initialTiers);
  const [newName, setNewName] = useState("");
  const [newRank, setNewRank] = useState(nextRank(initialTiers));
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function handleRename(tierId: string, name: string) {
    setTiers((prev) => prev.map((t) => (t.id === tierId ? { ...t, name } : t)));
    const result = await updateClubTier(tierId, { name });
    if ("error" in result) alert(result.error);
    router.refresh();
  }

  async function handleRerank(tierId: string, rank: number) {
    setTiers((prev) => prev.map((t) => (t.id === tierId ? { ...t, rank } : t)));
    const result = await updateClubTier(tierId, { rank });
    if ("error" in result) alert(result.error);
    router.refresh();
  }

  async function handleDelete(tierId: string) {
    if (!confirm("Remove this tier? Products using it will be left untiered, not deleted.")) {
      return;
    }
    setTiers((prev) => prev.filter((t) => t.id !== tierId));
    const result = await deleteClubTier(tierId);
    if ("error" in result) alert(result.error);
    router.refresh();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    const name = newName.trim();
    if (!name) {
      setAddError("Name is required.");
      return;
    }

    setAdding(true);
    const result = await createClubTier(clubId, name, newRank);
    setAdding(false);

    if ("error" in result) {
      setAddError(result.error);
      return;
    }

    const updated = [...tiers, result.tier];
    setTiers(updated);
    setNewName("");
    setNewRank(nextRank(updated));
    router.refresh();
  }

  const sorted = tiers.slice().sort((a, b) => a.rank - b.rank);

  return (
    <div className="rounded-sm border border-sage/20 bg-surface p-4">
      {sorted.length === 0 ? (
        <p className="text-xs text-sage">No tiers yet for this club — add one below.</p>
      ) : (
        <div className="space-y-1">
          {sorted.map((tier) => (
            <div key={tier.id} className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={tier.rank}
                title="Rank — lower shows first"
                onBlur={(e) => {
                  const rank = parseInt(e.target.value, 10);
                  if (!Number.isNaN(rank) && rank !== tier.rank) handleRerank(tier.id, rank);
                }}
                className={`${fieldClass} w-16`}
              />
              <input
                type="text"
                defaultValue={tier.name}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== tier.name) handleRename(tier.id, name);
                }}
                className={`${fieldClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => handleDelete(tier.id)}
                className="font-display text-xs uppercase tracking-tight text-sage hover:text-wood"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="mt-3 flex items-center gap-2 border-t border-sage/20 pt-3"
      >
        <input
          type="number"
          value={newRank}
          title="Rank — lower shows first"
          onChange={(e) => setNewRank(parseInt(e.target.value, 10) || 0)}
          className={`${fieldClass} w-16`}
        />
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New tier name (e.g. Legendary)"
          className={`${fieldClass} flex-1`}
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-sm bg-gold px-4 py-1.5 font-display text-xs uppercase tracking-tight text-base disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add tier"}
        </button>
      </form>
      {addError && <p className="mt-1 text-xs text-wood">{addError}</p>}
    </div>
  );
}
