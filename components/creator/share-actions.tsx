"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ShareActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedInIntent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={copyLink}>
        <Copy className="mr-2 h-4 w-4" />
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href={twitterIntent} target="_blank">
          <Share2 className="mr-2 h-4 w-4" /> Share on X
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href={linkedInIntent} target="_blank">
          Share on LinkedIn
        </Link>
      </Button>
    </div>
  );
}
