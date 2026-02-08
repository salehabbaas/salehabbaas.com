import Link from "next/link";

import { safeSocialLinks } from "@/lib/firestore/site-public";

export async function SiteFooter() {
  const socialLinks = await safeSocialLinks();

  return (
    <footer className="mt-24 border-t border-border/70 bg-background/70">
      <div className="container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-lg font-medium">Saleh Abbaas</p>
          <p className="text-sm text-muted-foreground">Senior full-stack engineer, Firebase architect, and creator.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {socialLinks.map((link) => (
            <Link key={link.label} href={link.url} className="text-sm text-foreground/75 hover:text-primary" target="_blank">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
