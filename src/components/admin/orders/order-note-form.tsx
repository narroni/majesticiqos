"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateOrderNote } from "@/lib/actions/admin-orders";

interface OrderNoteFormProps {
  orderId: string;
  initialNote: string;
}

export function OrderNoteForm({ orderId, initialNote }: OrderNoteFormProps) {
  const [note, setNote] = useState(initialNote);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateOrderNote(orderId, note);
      if (result.success) {
        toast.success("Note saved.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="admin-note">Internal note (never shown to the customer)</Label>
      <Textarea
        id="admin-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        disabled={isPending}
        onClick={handleSave}
      >
        {isPending ? "Saving…" : "Save note"}
      </Button>
    </div>
  );
}
