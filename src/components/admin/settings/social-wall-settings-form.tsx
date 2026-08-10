"use client";

import { ArrowDown, ArrowUp, ImageUp, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteProductImageFile, uploadSocialImage } from "@/lib/actions/admin-upload";
import { updateSocialWallSettings } from "@/lib/actions/admin-settings";
import type { SocialImage, StoreSettings } from "@/lib/data/settings";
import { cn } from "@/lib/cn";

const MAX_SOCIAL_IMAGES = 12;

type SocialLocale = "sq" | "en";

interface SocialWallSettingsFormProps {
  settings: StoreSettings;
}

interface LocaleFieldsProps {
  locale: SocialLocale;
  heading: string;
  onHeadingChange: (value: string) => void;
  handleText: string;
  onHandleTextChange: (value: string) => void;
  followUrl: string;
  onFollowUrlChange: (value: string) => void;
}

function LocaleFields({
  locale,
  heading,
  onHeadingChange,
  handleText,
  onHandleTextChange,
  followUrl,
  onFollowUrlChange,
}: LocaleFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`social-heading-${locale}`}>Section heading</Label>
        <Input
          id={`social-heading-${locale}`}
          value={heading}
          onChange={(event) => onHeadingChange(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`social-handle-${locale}`}>Handle text</Label>
        <Input
          id={`social-handle-${locale}`}
          placeholder="Follow @majestiqos.store"
          value={handleText}
          onChange={(event) => onHandleTextChange(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`social-follow-url-${locale}`}>Follow link</Label>
        <Input
          id={`social-follow-url-${locale}`}
          placeholder="https://instagram.com/majestiqos.store"
          value={followUrl}
          onChange={(event) => onFollowUrlChange(event.target.value)}
        />
      </div>
    </div>
  );
}

// Mirrors HeroSettingsForm's structure (per-locale tabs, same image-manager
// shape and upload pipeline) without the live preview — this section is a
// simple image grid, not layout-sensitive the way the hero is.
export function SocialWallSettingsForm({ settings }: SocialWallSettingsFormProps) {
  const [activeLocale, setActiveLocale] = useState<SocialLocale>("sq");
  const [headingSq, setHeadingSq] = useState(settings.socialHeadingSq ?? "");
  const [headingEn, setHeadingEn] = useState(settings.socialHeadingEn ?? "");
  const [handleTextSq, setHandleTextSq] = useState(settings.socialHandleTextSq ?? "");
  const [handleTextEn, setHandleTextEn] = useState(settings.socialHandleTextEn ?? "");
  const [followUrlSq, setFollowUrlSq] = useState(settings.socialFollowUrlSq ?? "");
  const [followUrlEn, setFollowUrlEn] = useState(settings.socialFollowUrlEn ?? "");
  const [images, setImages] = useState<SocialImage[]>(settings.socialImages);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).slice(0, Math.max(0, MAX_SOCIAL_IMAGES - images.length));
    setUploadingCount((count) => count + fileArray.length);

    for (const file of fileArray) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadSocialImage(formData);

      if (!result.success || !result.image) {
        toast.error(result.error ?? `Couldn't upload ${file.name}.`);
      } else {
        setImages((prev) => [...prev, { storagePath: result.image!.storagePath }]);
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
    const image = images[index];
    setImages((prev) => prev.filter((_, i) => i !== index));
    await deleteProductImageFile(image.storagePath);
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateSocialWallSettings({
        headingSq,
        headingEn,
        handleTextSq,
        handleTextEn,
        followUrlSq,
        followUrlEn,
        images,
      });
      if (result.success) {
        toast.success("Social wall saved.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-fg-primary font-display text-lg">Social wall</h2>
        <p className="text-fg-muted font-body text-xs">
          Leave any text field blank to fall back to the site&apos;s default copy. With no
          images, this section is hidden from the homepage entirely.
        </p>
      </div>

      <Tabs
        value={activeLocale}
        onValueChange={(value) => value && setActiveLocale(value as SocialLocale)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sq">Albanian</TabsTrigger>
          <TabsTrigger value="en">English</TabsTrigger>
        </TabsList>

        <TabsContent value="sq" className="pt-4">
          <LocaleFields
            locale="sq"
            heading={headingSq}
            onHeadingChange={setHeadingSq}
            handleText={handleTextSq}
            onHandleTextChange={setHandleTextSq}
            followUrl={followUrlSq}
            onFollowUrlChange={setFollowUrlSq}
          />
        </TabsContent>

        <TabsContent value="en" className="pt-4">
          <LocaleFields
            locale="en"
            heading={headingEn}
            onHeadingChange={setHeadingEn}
            handleText={handleTextEn}
            onHandleTextChange={setHandleTextEn}
            followUrl={followUrlEn}
            onFollowUrlChange={setFollowUrlEn}
          />
        </TabsContent>
      </Tabs>

      <div className="border-border flex flex-col gap-3 border-t pt-4">
        <div className="flex flex-col gap-1">
          <Label>Images</Label>
          <p className="text-fg-muted font-body text-xs">Shown in this order, left to right.</p>
        </div>

        {images.length < MAX_SOCIAL_IMAGES ? (
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
            <p className="text-fg-secondary font-body text-sm">Drag images here, or click to browse</p>
            <p className="text-fg-muted font-mono text-xs">
              JPEG, PNG, or WebP — up to 5MB each, {MAX_SOCIAL_IMAGES} max
            </p>
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
        ) : null}

        {uploadingCount > 0 ? (
          <p className="text-fg-muted font-mono text-xs">Uploading {uploadingCount}…</p>
        ) : null}

        {images.length > 0 ? (
          <div className="flex flex-col gap-2">
            {images.map((image, index) => (
              <div
                key={image.storagePath}
                className="border-border flex items-center gap-3 rounded-md border p-2"
              >
                <div className="bg-bg-subtle relative h-14 w-14 shrink-0 overflow-hidden rounded-sm">
                  <Image src={image.storagePath} alt="" fill sizes="56px" className="object-cover" />
                </div>
                <span className="text-fg-muted font-mono text-xs">#{index + 1}</span>
                <div className="ml-auto flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Move down"
                    disabled={index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                  >
                    <ArrowDown />
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
        ) : null}
      </div>

      <Button type="button" size="sm" className="self-start" disabled={isPending} onClick={handleSave}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
