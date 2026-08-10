"use client";

import { ImageUp, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { deleteProductImageFile, uploadCategoryImage } from "@/lib/actions/admin-upload";
import { cn } from "@/lib/cn";

interface CategoryImageFieldProps {
  categoryId: string;
  value: string;
  onChange: (storagePath: string) => void;
  error?: string;
}

// One image per category (BLUEPRINT), unlike ProductMediaFields' array —
// upload replaces whatever was there, matching the same magic-byte
// validation / WebP conversion / EXIF strip pipeline as product images.
export function CategoryImageField({ categoryId, value, onChange, error }: CategoryImageFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setIsUploading(true);
    const previousValue = value;
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadCategoryImage(categoryId, formData);
    setIsUploading(false);

    if (!result.success || !result.image) {
      toast.error(result.error ?? `Couldn't upload ${file.name}.`);
      return;
    }

    onChange(result.image.storagePath);
    if (previousValue) {
      await deleteProductImageFile(previousValue);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  async function handleRemove() {
    const previousValue = value;
    onChange("");
    if (previousValue) {
      await deleteProductImageFile(previousValue);
    }
  }

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <div className="border-border flex items-center gap-3 rounded-md border p-2">
          <div className="bg-bg-subtle relative h-16 w-24 shrink-0 overflow-hidden rounded-sm">
            <Image src={value} alt="" fill sizes="96px" className="object-cover" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Remove"
            className="ml-auto"
            onClick={handleRemove}
          >
            <Trash2 />
          </Button>
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "border-border-strong flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center transition-colors",
          isDragging && "border-accent bg-bg-subtle",
        )}
      >
        <ImageUp className="text-fg-muted size-5" />
        <p className="text-fg-secondary font-body text-sm">
          {isUploading ? "Uploading…" : "Drag an image here, or click to browse"}
        </p>
        <p className="text-fg-muted font-mono text-xs">JPEG, PNG, or WebP — up to 5MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadFile(file);
            event.target.value = "";
          }}
        />
      </div>
      {error ? <FormMessage>{error}</FormMessage> : null}
    </div>
  );
}
