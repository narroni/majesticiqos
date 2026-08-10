"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateContactSettings } from "@/lib/actions/admin-settings";
import type { StoreSettings } from "@/lib/data/settings";

export function ContactSettingsForm({ settings }: { settings: StoreSettings }) {
  const [contactEmail, setContactEmail] = useState(settings.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(settings.contactPhone ?? "");
  const [contactWhatsapp, setContactWhatsapp] = useState(settings.contactWhatsapp ?? "");
  const [instagramUrl, setInstagramUrl] = useState(settings.instagramUrl ?? "");
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookUrl ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateContactSettings({
        contactEmail,
        contactPhone,
        contactWhatsapp,
        instagramUrl,
        facebookUrl,
      });
      if (result.success) {
        toast.success("Contact details saved.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
      <h2 className="text-fg-primary font-display text-lg">Contact &amp; social</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input
            id="contact-phone"
            type="tel"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contact-whatsapp">WhatsApp number</Label>
          <Input
            id="contact-whatsapp"
            type="tel"
            value={contactWhatsapp}
            onChange={(event) => setContactWhatsapp(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="instagram-url">Instagram URL</Label>
          <Input
            id="instagram-url"
            type="url"
            placeholder="https://instagram.com/..."
            value={instagramUrl}
            onChange={(event) => setInstagramUrl(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="facebook-url">Facebook URL</Label>
          <Input
            id="facebook-url"
            type="url"
            placeholder="https://facebook.com/..."
            value={facebookUrl}
            onChange={(event) => setFacebookUrl(event.target.value)}
          />
        </div>
      </div>

      <Button type="button" size="sm" className="self-start" disabled={isPending} onClick={handleSave}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
