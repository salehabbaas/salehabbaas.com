import Link from "next/link";

function getYouTubeEmbed(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function classify(url?: string) {
  if (!url) return "generic";
  const lowered = url.toLowerCase();
  if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) return "youtube";
  if (lowered.includes("linkedin.com")) return "linkedin";
  if (lowered.includes("instagram.com")) return "instagram";
  if (lowered.includes("tiktok.com")) return "tiktok";
  return "generic";
}

export function CreatorMediaEmbed({ externalUrl, media }: { externalUrl?: string; media: string[] }) {
  const mediaUrl = media[0] || externalUrl;
  const type = classify(externalUrl || mediaUrl);

  if (!mediaUrl) {
    return null;
  }

  if (type === "youtube") {
    const embed = getYouTubeEmbed(mediaUrl);
    if (embed) {
      return (
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-black/95">
          <iframe
            src={embed}
            title="YouTube player"
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
  }

  if (type === "linkedin") {
    return (
      <div className="rounded-3xl border border-border/70 bg-white p-5">
        <p className="text-sm font-semibold text-foreground">LinkedIn Post</p>
        <p className="mt-2 text-sm text-muted-foreground">View the full post on LinkedIn for comments and engagement.</p>
        <Link href={mediaUrl} target="_blank" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Open LinkedIn Post
        </Link>
      </div>
    );
  }

  if (type === "instagram" || type === "tiktok") {
    return (
      <div className="rounded-3xl border border-border/70 bg-white p-5">
        <p className="text-sm font-semibold text-foreground">{type === "instagram" ? "Instagram" : "TikTok"} Content</p>
        <p className="mt-2 text-sm text-muted-foreground">Native embed support can vary by browser and privacy settings.</p>
        <Link href={mediaUrl} target="_blank" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Open Original Post
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-white p-5">
      <p className="text-sm text-muted-foreground">Open media in a new tab.</p>
      <Link href={mediaUrl} target="_blank" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        View Media
      </Link>
    </div>
  );
}
