import { getAuth } from "firebase-admin/auth";
import { initAdminForScripts } from "./firebase-admin-init";

function getArg(index: number) {
  return process.argv[index]?.trim() || "";
}

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

async function main() {
  const email = getArg(2) || getEnv("ADMIN_BOOTSTRAP_EMAIL");
  const password = getArg(3) || getEnv("ADMIN_BOOTSTRAP_PASSWORD");

  if (!email || !password) {
    throw new Error(
      "Missing admin credentials. Provide `npm run create-admin -- <email> <password>` or set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env.local."
    );
  }

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
