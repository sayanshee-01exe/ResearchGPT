export type View = "home" | "library" | "history" | "tool-citation-graph";

export const PLACEHOLDER_VIEWS: Record<string, { title: string; body: string }> = {
  library: {
    title: "My Library is coming soon",
    body: "Saved papers and collections will live here. For now, papers belong to the thread you loaded them into.",
  },
  "tool-citation-graph": {
    title: "Citation Graph is coming soon",
    body: "A visual map of how your papers cite each other is planned for a future release.",
  },
};
