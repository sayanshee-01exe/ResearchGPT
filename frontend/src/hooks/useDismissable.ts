import { useEffect } from "react";
import type { RefObject } from "react";

/** Close a popover on an outside click or Escape. */
export function useDismissable(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onClose: () => void
): void {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, ref, onClose]);
}
