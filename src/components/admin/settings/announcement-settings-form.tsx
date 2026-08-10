"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateAnnouncementSettings } from "@/lib/actions/admin-settings";
import type { StoreSettings } from "@/lib/data/settings";

export function AnnouncementSettingsForm({ settings }: { settings: StoreSettings }) {
  const [textSq, setTextSq] = useState(settings.announcementTextSq ?? "");
  const [textEn, setTextEn] = useState(settings.announcementTextEn ?? "");
  const [enabled, setEnabled] = useState(settings.announcementEnabled);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateAnnouncementSettings({ textSq, textEn, enabled });
      if (result.success) {
        toast.success("Announcement bar saved.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-fg-primary font-display text-lg">Announcement bar</h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="announcement-enabled" className="font-normal">
            {enabled ? "On" : "Off"}
          </Label>
          <Switch id="announcement-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="announcement-sq">Albanian</Label>
        <Input id="announcement-sq" value={textSq} onChange={(event) => setTextSq(event.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="announcement-en">English</Label>
        <Input id="announcement-en" value={textEn} onChange={(event) => setTextEn(event.target.value)} />
      </div>

      <p className="text-fg-muted font-body text-xs">
        Shown at the top of the homepage only, in the customer&apos;s current language. Leave
        empty (or off) to hide it.
      </p>

      <Button type="button" size="sm" className="self-start" disabled={isPending} onClick={handleSave}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
