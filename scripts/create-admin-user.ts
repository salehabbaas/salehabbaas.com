import { getAuth } from "firebase-admin/auth";
import { initAdminForScripts } from "./firebase-admin-init";

const DEFAULT_EMAIL = "saleh@artelo.ai";
const DEFAULT_PASSWORD = "sH@.2026";

function getArg(index: number, fallback: string) {
  return process.argv[index]?.trim() || fallback;
}

async function main() {
  const email = getArg(2, DEFAULT_EMAIL);
  const password = getArg(3, DEFAULT_PASSWORD);

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  initAdminForScripts();
  const auth = getAuth();

  let user = null as Awaited<ReturnType<typeof auth.getUserByEmail>> | null;

  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, {
      email,
      password,
      emailVerified: true,
      disabled: false
    });
    console.log(`Updated existing user: ${email}`);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code !== "auth/user-not-found") {
      throw error;
    }

    user = await auth.createUser({
      email,
      password,
      emailVerified: true
    });
    console.log(`Created user: ${email}`);
  }

  if (!user) {
    throw new Error("Unable to create or load admin user.");
  }

  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`Admin claim enabled for: ${email} (uid: ${user.uid})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
