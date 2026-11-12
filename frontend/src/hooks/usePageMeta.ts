import { useEffect } from "react";

/** Gives each public page its own browser-tab title and search-result snippet. */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [title, description]);
}
