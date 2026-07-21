import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: pnpm bootstrap <email>");
    process.exit(1);
  }

  const supabase = createAdminClient();

  // 1. Find the auth.users row for this email — never create one here.
  const { data: usersPage, error: usersError } =
    await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error(`Could not look up users: ${usersError.message}`);
    process.exit(1);
  }

  const user = usersPage.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!user) {
    console.error(
      `No auth user found for ${email}. Sign in once via the magic link ` +
        `at /login first, then re-run this script.`,
    );
    process.exit(1);
  }

  // 2. Create the club row if it doesn't exist yet.
  const clubName = process.env.BOOTSTRAP_CLUB_NAME || "Demo Club";
  const clubSlug = process.env.BOOTSTRAP_CLUB_SLUG || "demo-club";

  const { data: existingClub, error: clubLookupError } = await supabase
    .from("clubs")
    .select("*")
    .eq("slug", clubSlug)
    .maybeSingle();

  if (clubLookupError) {
    console.error(`Could not look up club: ${clubLookupError.message}`);
    process.exit(1);
  }

  let club = existingClub;
  let clubCreated = false;

  if (!club) {
    const { data: newClub, error: clubInsertError } = await supabase
      .from("clubs")
      .insert({ name: clubName, slug: clubSlug })
      .select()
      .single();

    if (clubInsertError || !newClub) {
      console.error(`Could not create club: ${clubInsertError?.message}`);
      process.exit(1);
    }

    club = newClub;
    clubCreated = true;
  }

  // 3. Create (or fix up) the members row — idempotent, safe to re-run.
  const { data: existingMember, error: memberLookupError } = await supabase
    .from("members")
    .select("*")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberLookupError) {
    console.error(`Could not look up member: ${memberLookupError.message}`);
    process.exit(1);
  }

  let memberCreated = false;
  let memberUpdated = false;

  if (!existingMember) {
    const { error: memberInsertError } = await supabase.from("members").insert({
      club_id: club.id,
      user_id: user.id,
      alias: email.split("@")[0],
      role: "owner",
      status: "active",
    });

    if (memberInsertError) {
      console.error(`Could not create member: ${memberInsertError.message}`);
      process.exit(1);
    }

    memberCreated = true;
  } else if (
    existingMember.role !== "owner" ||
    existingMember.status !== "active"
  ) {
    const { error: memberUpdateError } = await supabase
      .from("members")
      .update({ role: "owner", status: "active" })
      .eq("id", existingMember.id);

    if (memberUpdateError) {
      console.error(`Could not update member: ${memberUpdateError.message}`);
      process.exit(1);
    }

    memberUpdated = true;
  }

  // 5. Report what happened. Never print keys or tokens.
  console.log(`User: ${email} (${user.id})`);
  console.log(
    clubCreated
      ? `Club: created "${club.name}" (slug: ${club.slug})`
      : `Club: "${club.name}" (slug: ${club.slug}) already existed`,
  );
  console.log(
    memberCreated
      ? "Member: created with role=owner, status=active"
      : memberUpdated
        ? "Member: existing row updated to role=owner, status=active"
        : "Member: already role=owner, status=active — nothing to do",
  );
}

main();
