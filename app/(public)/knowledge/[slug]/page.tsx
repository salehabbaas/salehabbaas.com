import { permanentRedirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegacyKnowledgePostPage({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/blog/${slug}`);
}
