"use client";

import { ArrowDown, ArrowUp, ImageUp, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteProductImageFile, uploadProductImage } from "@/lib/actions/admin-upload";
import { cn } from "@/lib/cn";
import type { AdminProductValues } from "@/lib/validation/admin-product";

interface ProductMediaFieldsProps {
  productId: string;
}

export function ProductMediaFields({ productId }: ProductMediaFieldsProps) {
  const form = useFormContext<AdminProductValues>();
  const { fields, append, remove, move, update } = useFieldArray({
    control: form.control,
    name: "images",
  });

  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesError = form.formState.errors.images;

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    setUploadingCount((count) => count + fileArray.length);

    for (const file of fileArray) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadProductImage(productId, formData);

      if (!result.success || !result.image) {
        toast.error(result.error ?? `Couldn't upload ${file.name}.`);
      } else {
        append({
          storagePath: result.image.storagePath,
          altSq: "",
          altEn: "",
          width: result.image.width,
          height: result.image.height,
          blurDataUrl: result.image.blurDataUrl,
        });
      }
      setUploadingCount((count) => count - 1);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  }

  async function handleRemove(index: number) {
    const image = fields[index];
    remove(index);
    await deleteProductImageFile(image.storagePath);
  }

  return (
    <div className="flex flex-col gap-4">
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
          "border-border-strong flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center transition-colors",
          isDragging && "border-accent bg-bg-subtle",
        )}
      >
        <ImageUp className="text-fg-muted size-6" />
        <p className="text-fg-secondary font-body text-sm">
          Drag images here, or click to browse
        </p>
        <p className="text-fg-muted font-mono text-xs">JPEG, PNG, or WebP — up to 5MB each</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {uploadingCount > 0 ? (
        <p className="text-fg-muted font-mono text-xs">Uploading {uploadingCount}…</p>
      ) : null}

      {imagesError ? <FormMessage>{imagesError.message as string}</FormMessage> : null}

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="border-border flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start"
          >
            <div className="bg-bg-subtle relative h-24 w-20 shrink-0 overflow-hidden rounded-sm">
              <Image
                src={field.storagePath}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
              {index === 0 ? (
                <span className="bg-accent text-bg-base absolute top-1 left-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase">
                  Primary
                </span>
              ) : null}
            </div>

            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Alt text (Albanian)</Label>
                <Input
                  value={field.altSq ?? ""}
                  onChange={(event) => update(index, { ...field, altSq: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Alt text (English)</Label>
                <Input
                  value={field.altEn ?? ""}
                  onChange={(event) => update(index, { ...field, altEn: event.target.value })}
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Move up"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Move down"
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Set as primary"
                disabled={index === 0}
                onClick={() => move(index, 0)}
              >
                <Star />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title="Remove"
                onClick={() => handleRemove(index)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
