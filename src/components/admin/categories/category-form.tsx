"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CategoryImageField } from "@/components/admin/categories/category-image-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { checkCategorySlugAvailability, saveCategory } from "@/lib/actions/admin-categories";
import { slugify } from "@/lib/utils";
import { adminCategorySchema, type AdminCategoryValues } from "@/lib/validation/admin-category";

const SLUG_CHECK_DEBOUNCE_MS = 500;

interface CategoryFormProps {
  mode: "create" | "edit";
  defaultValues: AdminCategoryValues;
}

type SlugStatus = "idle" | "checking" | "available" | "taken";

export function CategoryForm({ mode, defaultValues }: CategoryFormProps) {
  const router = useRouter();
  const slugTouchedRef = useRef(mode === "edit");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");

  const form = useForm<AdminCategoryValues>({
    resolver: zodResolver(adminCategorySchema),
    defaultValues,
  });

  const nameSq = useWatch({ control: form.control, name: "nameSq" });
  const slug = useWatch({ control: form.control, name: "slug" });

  // Auto-generate the slug from the Albanian name until the admin edits it
  // by hand — same as ProductForm, edit mode never auto-updates the slug.
  useEffect(() => {
    if (mode !== "create" || slugTouchedRef.current) return;
    form.setValue("slug", slugify(nameSq), { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameSq, mode]);

  useEffect(() => {
    if (!slug) return;

    const timeoutId = setTimeout(() => {
      setSlugStatus("checking");
      checkCategorySlugAvailability(slug, mode === "edit" ? defaultValues.id : undefined).then(
        (available) => setSlugStatus(available ? "available" : "taken"),
      );
    }, SLUG_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function onSubmit(values: AdminCategoryValues) {
    const result = await saveCategory(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field in defaultValues) {
          form.setError(fieldError.field as keyof AdminCategoryValues, {
            message: fieldError.message,
          });
        } else {
          toast.error(fieldError.message);
        }
      }
      return;
    }

    toast.success(mode === "create" ? "Category created." : "Category saved.");
    router.push("/admin/categories");
  }

  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="text-fg-primary font-display text-sm">Albanian</h2>
            <FormField
              control={form.control}
              name="nameSq"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descriptionSq"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-fg-primary font-display text-sm">English</h2>
            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descriptionEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="border-border flex flex-col gap-5 border-t pt-5">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(event) => {
                      slugTouchedRef.current = true;
                      field.onChange(event.target.value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {slugStatus === "checking" && "Checking availability…"}
                  {slugStatus === "available" && "Available."}
                  {slugStatus === "taken" && "Already in use — pick another."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
                <CategoryImageField
                  categoryId={defaultValues.id}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={form.formState.errors.imageUrl?.message}
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem className="max-w-40">
                <FormLabel>Sort order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </FormControl>
                <FormDescription>Lower numbers show first. Also adjustable from the list.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className="font-normal">Active (visible on the storefront)</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="border-border flex items-center justify-end gap-3 border-t pt-4">
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting || slugStatus === "taken"}>
            {form.formState.isSubmitting ? "Saving…" : mode === "create" ? "Create category" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
