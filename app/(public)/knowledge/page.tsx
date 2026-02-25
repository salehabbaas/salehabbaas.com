import { permanentRedirect } from "next/navigation";

export default function LegacyKnowledgePage() {
  permanentRedirect("/blog");
}
