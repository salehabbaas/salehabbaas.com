"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpenText, Clapperboard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { homeFadeUp, homeStagger, homeViewport } from "@/lib/motion/home";
import { formatDate, truncate } from "@/lib/utils";
import type { HomeCreatorPreviewProps } from "@/components/site/home/types";

export function CreatorPreview({ creatorItems, knowledgeItems }: HomeCreatorPreviewProps) {
  const knowledgeRef = useRef<HTMLDivElement | null>(null);

  function scrollKnowledge(direction: -1 | 1) {
    knowledgeRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  if (!creatorItems.length && !knowledgeItems.length) return null;

  return (
    <section className="bg-background pb-20">
      <div className="container">
        <motion.div variants={homeStagger} initial="hidden" whileInView="visible" viewport={homeViewport} className="space-y-10">
          <motion.div variants={homeFadeUp} className="space-y-4">
            <p className="text-xs uppercase tracking-[0.24em] text-primary">Creator & Blog</p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Insights on healthcare engineering, architecture, and delivery.
            </h2>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <motion.section variants={homeFadeUp} className="space-y-4" aria-label="Latest knowledge articles">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Blog & Articles</h3>
                  <p className="text-sm text-muted-foreground">Thought leadership, clinical data notes, and delivery playbooks.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => scrollKnowledge(-1)} aria-label="Scroll left">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => scrollKnowledge(1)} aria-label="Scroll right">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button asChild variant="outline" className="hidden sm:inline-flex">
                    <Link href="/knowledge">View all</Link>
                  </Button>
                </div>
              </div>

              {knowledgeItems.length ? (
                <div ref={knowledgeRef} className="flex snap-x gap-4 overflow-x-auto pb-2">
                  {knowledgeItems.slice(0, 8).map((post) => (
                    <article
                      key={post.id}
                      className="min-w-[min(18rem,82vw)] snap-start rounded-3xl border border-primary/20 bg-primary/10 p-5 transition-shadow hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-xs uppercase tracking-[0.2em] text-primary">Knowledge</p>
                          <p className="text-lg font-semibold text-foreground">{post.title}</p>
                        </div>
                        <BookOpenText className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-foreground/75">{truncate(post.excerpt, 130)}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {(post.tags || []).slice(0, 2).map((tag) => (
                          <Badge key={`${post.id}-${tag}`} variant="secondary" className="rounded-full border-primary/20 bg-primary/10 text-foreground/75">
                            {tag}
                          </Badge>
                        ))}
                        {post.publishedAt || post.updatedAt ? (
                          <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt || post.updatedAt)}</span>
                        ) : null}
                      </div>
                      <Link href={`/knowledge/${post.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm text-primary transition hover:text-foreground">
                        Read article
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Publish your first blog post in the admin CMS.</p>
              )}
            </motion.section>

            <motion.section variants={homeFadeUp} className="space-y-4" aria-label="Latest creator content">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Creator Dispatch</h3>
                <Link href="/creator" className="inline-flex items-center gap-1 text-sm text-foreground transition hover:text-foreground">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-3">
                {creatorItems.length ? (
                  creatorItems.slice(0, 3).map((item) => (
                    <article key={item.id} className="rounded-2xl border border-primary/20 bg-primary/10 p-4 transition-shadow hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">{item.contentTitle}</p>
                          <p className="text-sm leading-7 text-foreground/75">{truncate(item.hook || item.body, 135)}</p>
                        </div>
                        <Clapperboard className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full border-primary/20 bg-primary/10 text-foreground/75">
                          {item.platform}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full border-primary/20 bg-primary/10 text-foreground/75">
                          {item.pillar}
                        </Badge>
                        {item.publishedAt ? <span className="text-xs text-muted-foreground">{formatDate(item.publishedAt)}</span> : null}
                      </div>
                      <Link
                        href={`/creator/${item.slug}`}
                        className="mt-4 inline-flex items-center gap-1 text-sm text-primary transition hover:text-foreground"
                      >
                        Read content
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No public creator posts yet.</p>
                )}
              </div>
            </motion.section>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
