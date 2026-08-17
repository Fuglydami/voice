import type { Metadata } from "next";
import { FeedClient } from "./FeedClient";

export const metadata: Metadata = {
  title: "My feed",
  description: "A news feed built from your chosen sources, categories and authors.",
};

export default function FeedPage() {
  return <FeedClient />;
}
