import { createFileRoute } from "@tanstack/react-router";
import { UniversePage } from "@/features/universe/universe-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Explore the Universe · Blue Science Park" },
      {
        name: "description",
        content:
          "Explore companies, discover relevant opportunities, and find complementary expertise in the Blue Science Park innovation ecosystem.",
      },
      { property: "og:title", content: "Explore the Universe · Blue Science Park" },
      {
        property: "og:description",
        content:
          "A living ecosystem of companies and innovation opportunities. Find your next connection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UniversePage,
});
