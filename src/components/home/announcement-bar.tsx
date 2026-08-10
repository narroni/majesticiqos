"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "announcement-dismissed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

interface AnnouncementBarProps {
  text: string;
}

// Seller-editable via /admin/settings (BLUEPRINT §6.5) — the caller decides
// whether to render this at all (enabled flag + non-empty text for the
// current locale), so an unset announcement renders nothing rather than a
// placeholder.
export function AnnouncementBar({ text }: AnnouncementBarProps) {
  const tCommon = useTranslations("common");
  const isDismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (isDismissed) {
    return null;
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <div className="bg-bg-subtle relative flex h-8 items-center justify-center px-10">
      <p className="text-fg-secondary font-mono text-xs tracking-[0.15em] uppercase">
        {text}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={tCommon("close")}
        className="text-fg-muted hover:text-fg-primary absolute right-4"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
