import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { adminDashboardSnapshot, adminPageOwnership } from "../lib/admin/ownership";

function fail(message: string) {
  // eslint-disable-next-line no-console
  console.error(`Admin ownership check failed: ${message}`);
  process.exit(1);
}

function checkOwnershipConflicts() {
  const owners = new Map<string, string[]>();
  Object.entries(adminPageOwnership).forEach(([page, keys]) => {
    keys.forEach((key) => {
      const existing = owners.get(key) ?? [];
      owners.set(key, [...existing, page]);
    });
  });

  const conflicts = Array.from(owners.entries()).filter(([, pages]) => pages.length > 1);
  if (conflicts.length) {
    const details = conflicts.map(([key, pages]) => `${key}: ${pages.join(", ")}`).join("\n");
    fail(`Duplicate ownership keys found:\n${details}`);
  }
}

function checkDashboardSnapshot() {
  const current = adminPageOwnership["/admin"] ?? [];
  const normalizedCurrent = [...current].sort();
  const normalizedExpected = [...adminDashboardSnapshot].sort();
  if (JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedExpected)) {
    fail(`/admin ownership snapshot mismatch.\nexpected=${normalizedExpected.join(", ")}\nactual=${normalizedCurrent.join(", ")}`);
  }
}

function checkNavigationDedup() {
  const root = resolve(process.cwd());
  const startDirs = [join(root, "components/admin"), join(root, "app/(admin)/admin/(protected)")];
  const files: string[] = [];

  function walk(directory: string) {
    const entries = readdirSync(directory);
    entries.forEach((entry) => {
      const fullPath = join(directory, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
        return;
      }
      if (fullPath.endsWith(".tsx")) {
        files.push(fullPath);
      }
    });
  }

  startDirs.forEach((dir) => {
    if (statSync(dir, { throwIfNoEntry: false })) {
      walk(dir);
    }
  });

  const offenders: string[] = [];

  files.forEach((file) => {
    if (file.endsWith("components/admin/admin-shell.tsx")) return;
    const source = readFileSync(file, "utf8");
    if (source.includes("adminNavigationSections") || source.includes("adminNavigation")) {
      offenders.push(file.replace(`${root}/`, ""));
    }
  });

  if (offenders.length) {
    fail(`Navigation source is duplicated outside shell:\n${offenders.join("\n")}`);
  }
}

function main() {
  checkOwnershipConflicts();
  checkDashboardSnapshot();
  checkNavigationDedup();
  // eslint-disable-next-line no-console
  console.log("Admin ownership check passed.");
}

main();
