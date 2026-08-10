"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The exact string the admin must type before the confirm button enables. */
  confirmText: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
}

// Permanent order deletion has no undo, so "click OK" isn't enough friction
// — typing an exact string (the order number for a single delete, the
// literal word DELETE for a bulk one) is. Resets its own input whenever the
// dialog closes so a stale match can't linger into the next open.
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel,
  isPending,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [typed, setTyped] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTyped("");
    }
    onOpenChange(next);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="delete-confirm-input">
            {confirmLabel} — type <span className="text-fg-primary font-mono">{confirmText}</span> to
            confirm
          </Label>
          <Input
            id="delete-confirm-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={typed !== confirmText || isPending}
            onClick={onConfirm}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Delete permanently
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
