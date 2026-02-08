import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="font-serif text-5xl">404</h1>
      <p className="mt-3 text-muted-foreground">The page you requested was not found.</p>
      <Link href="/" className="mt-6 text-sm font-medium text-primary hover:underline">
        Back home
      </Link>
    </div>
  );
}
