"use client";

import { ArrowDown, ArrowUp, ImageUp, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { HeroHighlightArea } from "@/components/home/hero-content";
import { HeroPreviewPanel } from "@/components/admin/settings/hero-preview-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { deleteProductImageFile, uploadHeroImage } from "@/lib/actions/admin-upload";
import { updateHeroSettings } from "@/lib/actions/admin-settings";
import type { HeroImage, StoreSettings } from "@/lib/data/settings";
import { cn } from "@/lib/cn";

const MAX_HERO_IMAGES = 10;

type HeroLocale = "sq" | "en";

interface HeroLocaleDefaults {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

interface HeroSettingsFormProps {
  settings: StoreSettings;
  heroDefaults: Record<HeroLocale, HeroLocaleDefaults>;
}

interface LocaleFieldsProps {
  locale: HeroLocale;
  tagline: string;
  onTaglineChange: (value: string) => void;
  heading: string;
  onHeadingChange: (value: string) => void;
  subheading: string;
  onSubheadingChange: (value: string) => void;
  ctaText: string;
  onCtaTextChange: (value: string) => void;
  ctaHref: string;
  onCtaHrefChange: (value: string) => void;
  onFocusField: (field: HeroHighlightArea) => void;
  onBlurField: () => void;
}

// Labelled by where each field appears, not by its technical name — the
// seller editing this has never heard "hero.heroCtaHrefSq".
function LocaleFields({
  locale,
  tagline,
  onTaglineChange,
  heading,
  onHeadingChange,
  subheading,
  onSubheadingChange,
  ctaText,
  onCtaTextChange,
  ctaHref,
  onCtaHrefChange,
  onFocusField,
  onBlurField,
}: LocaleFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`hero-tagline-${locale}`}>Small text above the heading — optional</Label>
        <Input
          id={`hero-tagline-${locale}`}
          value={tagline}
          onChange={(event) => onTaglineChange(event.target.value)}
          onFocus={() => onFocusField("tagline")}
          onBlur={onBlurField}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`hero-heading-${locale}`}>Main heading</Label>
        <Input
          id={`hero-heading-${locale}`}
          value={heading}
          onChange={(event) => onHeadingChange(event.target.value)}
          onFocus={() => onFocusField("heading")}
          onBlur={onBlurField}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`hero-subheading-${locale}`}>Text below the heading</Label>
        <Textarea
          id={`hero-subheading-${locale}`}
          value={subheading}
          onChange={(event) => onSubheadingChange(event.target.value)}
          onFocus={() => onFocusField("subheading")}
          onBlur={onBlurField}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`hero-cta-text-${locale}`}>Button text</Label>
        <Input
          id={`hero-cta-text-${locale}`}
          value={ctaText}
          onChange={(event) => onCtaTextChange(event.target.value)}
          onFocus={() => onFocusField("cta")}
          onBlur={onBlurField}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`hero-cta-href-${locale}`}>Button link</Label>
        <Input
          id={`hero-cta-href-${locale}`}
          placeholder="/products"
          value={ctaHref}
          onChange={(event) => onCtaHrefChange(event.target.value)}
          onFocus={() => onFocusField("cta")}
          onBlur={onBlurField}
        />
      </div>
    </div>
  );
}

export function HeroSettingsForm({ settings, heroDefaults }: HeroSettingsFormProps) {
  const [activeLocale, setActiveLocale] = useState<HeroLocale>("sq");
  const [focusedField, setFocusedField] = useState<HeroHighlightArea>(null);

  const [taglineSq, setTaglineSq] = useState(settings.heroTaglineSq ?? "");
  const [taglineEn, setTaglineEn] = useState(settings.heroTaglineEn ?? "");
  const [headingSq, setHeadingSq] = useState(settings.heroHeadingSq ?? "");
  const [headingEn, setHeadingEn] = useState(settings.heroHeadingEn ?? "");
  const [subheadingSq, setSubheadingSq] = useState(settings.heroSubheadingSq ?? "");
  const [subheadingEn, setSubheadingEn] = useState(settings.heroSubheadingEn ?? "");
  const [ctaTextSq, setCtaTextSq] = useState(settings.heroCtaTextSq ?? "");
  const [ctaTextEn, setCtaTextEn] = useState(settings.heroCtaTextEn ?? "");
  const [ctaHrefSq, setCtaHrefSq] = useState(settings.heroCtaHrefSq ?? "");
  const [ctaHrefEn, setCtaHrefEn] = useState(settings.heroCtaHrefEn ?? "");
  const [images, setImages] = useState<HeroImage[]>(settings.heroImages);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFocusField(locale: HeroLocale, field: HeroHighlightArea) {
    setActiveLocale(locale);
    setFocusedField(field);
  }

  async function uploadFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).slice(0, Math.max(0, MAX_HERO_IMAGES - images.length));
    setUploadingCount((count) => count + fileArray.length);

    for (const file of fileArray) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadHeroImage(formData);

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
      const result = await updateHeroSettings({
        taglineSq,
        taglineEn,
        headingSq,
        headingEn,
        subheadingSq,
        subheadingEn,
        ctaTextSq,
        ctaTextEn,
        ctaHrefSq,
        ctaHrefEn,
        images,
      });
      if (result.success) {
        toast.success("Hero section saved.");
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  const previewValues = {
    sq: {
      tagline: taglineSq,
      heading: headingSq || heroDefaults.sq.title,
      subheading: subheadingSq || heroDefaults.sq.subtitle,
      ctaText: ctaTextSq || heroDefaults.sq.ctaPrimary,
      secondaryCtaText: heroDefaults.sq.ctaSecondary,
    },
    en: {
      tagline: taglineEn,
      heading: headingEn || heroDefaults.en.title,
      subheading: subheadingEn || heroDefaults.en.subtitle,
      ctaText: ctaTextEn || heroDefaults.en.ctaPrimary,
      secondaryCtaText: heroDefaults.en.ctaSecondary,
    },
  }[activeLocale];

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-6">
      <HeroPreviewPanel
        tagline={previewValues.tagline}
        heading={previewValues.heading}
        subheading={previewValues.subheading}
        ctaText={previewValues.ctaText}
        secondaryCtaText={previewValues.secondaryCtaText}
        images={images}
        highlightedArea={focusedField}
      />

      <div className="border-border bg-bg-elevated flex flex-col gap-4 rounded-md border p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-fg-primary font-display text-lg">Homepage hero</h2>
          <p className="text-fg-muted font-body text-xs">
            Leave any text field blank to fall back to the site&apos;s default copy.
          </p>
        </div>

        <Tabs value={activeLocale} onValueChange={(value) => value && setActiveLocale(value as HeroLocale)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sq">Albanian</TabsTrigger>
            <TabsTrigger value="en">English</TabsTrigger>
          </TabsList>

          <TabsContent value="sq" className="pt-4">
            <LocaleFields
              locale="sq"
              tagline={taglineSq}
              onTaglineChange={setTaglineSq}
              heading={headingSq}
              onHeadingChange={setHeadingSq}
              subheading={subheadingSq}
              onSubheadingChange={setSubheadingSq}
              ctaText={ctaTextSq}
              onCtaTextChange={setCtaTextSq}
              ctaHref={ctaHrefSq}
              onCtaHrefChange={setCtaHrefSq}
              onFocusField={(field) => handleFocusField("sq", field)}
              onBlurField={() => setFocusedField(null)}
            />
          </TabsContent>

          <TabsContent value="en" className="pt-4">
            <LocaleFields
              locale="en"
              tagline={taglineEn}
              onTaglineChange={setTaglineEn}
              heading={headingEn}
              onHeadingChange={setHeadingEn}
              subheading={subheadingEn}
              onSubheadingChange={setSubheadingEn}
              ctaText={ctaTextEn}
              onCtaTextChange={setCtaTextEn}
              ctaHref={ctaHrefEn}
              onCtaHrefChange={setCtaHrefEn}
              onFocusField={(field) => handleFocusField("en", field)}
              onBlurField={() => setFocusedField(null)}
            />
          </TabsContent>
        </Tabs>

        <div className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-col gap-1">
            <Label>Background images</Label>
            <p className="text-fg-muted font-body text-xs">
              First image shows initially; with two or more, they cross-fade slowly in this order.
              With none, the hero uses the plain dark background.
            </p>
          </div>

          {images.length < MAX_HERO_IMAGES ? (
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
                JPEG, PNG, or WebP — up to 5MB each, {MAX_HERO_IMAGES} max
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
                  <div className="bg-bg-subtle relative h-14 w-20 shrink-0 overflow-hidden rounded-sm">
                    <Image src={image.storagePath} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <span className="text-fg-muted font-mono text-xs">
                    {index === 0 ? "First" : `#${index + 1}`}
                  </span>
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
    </div>
  );
}
