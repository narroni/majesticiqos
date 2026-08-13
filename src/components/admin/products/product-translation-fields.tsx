"use client";

import { useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProductValues } from "@/lib/validation/admin-product";

interface ProductTranslationFieldsProps {
  locale: "sq" | "en";
  /** Only meaningful for locale="sq" — drives ProductForm's auto-slug. */
  onNameChange?: (value: string) => void;
}

const SUFFIX = { sq: "Sq", en: "En" } as const;

export function ProductTranslationFields({ locale, onNameChange }: ProductTranslationFieldsProps) {
  const form = useFormContext<AdminProductValues>();
  const suffix = SUFFIX[locale];

  function copyFromAlbanian() {
    form.setValue("nameEn", form.getValues("nameSq"), { shouldValidate: true, shouldDirty: true });
    form.setValue("shortDescriptionEn", form.getValues("shortDescriptionSq"), {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("descriptionEn", form.getValues("descriptionSq"), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {locale === "en" ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={copyFromAlbanian}>
          Copy from Albanian
        </Button>
      ) : null}

      <FormField
        control={form.control}
        name={`name${suffix}` as "nameSq" | "nameEn"}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name {locale === "sq" ? "(required)" : ""}</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(event) => {
                  field.onChange(event);
                  onNameChange?.(event.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`shortDescription${suffix}` as "shortDescriptionSq" | "shortDescriptionEn"}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Short description</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`description${suffix}` as "descriptionSq" | "descriptionEn"}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea rows={6} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`metaTitle${suffix}` as "metaTitleSq" | "metaTitleEn"}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Meta title (optional)</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`metaDescription${suffix}` as "metaDescriptionSq" | "metaDescriptionEn"}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Meta description (optional)</FormLabel>
            <FormControl>
              <Textarea rows={2} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
