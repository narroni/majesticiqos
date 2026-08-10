"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ProductMediaFields } from "@/components/admin/products/product-media-fields";
import { ProductTranslationFields } from "@/components/admin/products/product-translation-fields";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkSlugAvailability, saveProduct } from "@/lib/actions/admin-products";
import type { AdminCategoryOption } from "@/lib/data/admin-products";
import { slugify } from "@/lib/utils";
import { adminProductSchema, type AdminProductValues } from "@/lib/validation/admin-product";

const NO_CATEGORY = "none";
const SLUG_CHECK_DEBOUNCE_MS = 500;

interface ProductFormProps {
  mode: "create" | "edit";
  defaultValues: AdminProductValues;
  categories: AdminCategoryOption[];
}

type SlugStatus = "idle" | "checking" | "available" | "taken";

export function ProductForm({ mode, defaultValues, categories }: ProductFormProps) {
  const router = useRouter();
  const slugTouchedRef = useRef(mode === "edit");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");

  const form = useForm<AdminProductValues>({
    resolver: zodResolver(adminProductSchema),
    defaultValues,
  });

  const nameSq = useWatch({ control: form.control, name: "nameSq" });
  const slug = useWatch({ control: form.control, name: "slug" });

  // Base UI's <Select.Value> resolves the trigger's displayed label from
  // this `items` map (value -> label), not from the rendered <SelectItem>
  // children — without it, the closed trigger shows the raw category id.
  const categoryItems = {
    [NO_CATEGORY]: "No category",
    ...Object.fromEntries(categories.map((category) => [category.id, category.name])),
  };

  // Auto-generate the slug from the Albanian name until the admin edits it
  // by hand — edit mode never auto-updates an existing product's slug.
  useEffect(() => {
    if (mode !== "create" || slugTouchedRef.current) return;
    form.setValue("slug", slugify(nameSq), { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameSq, mode]);

  useEffect(() => {
    if (!slug) return;

    const timeoutId = setTimeout(() => {
      setSlugStatus("checking");
      checkSlugAvailability(slug, mode === "edit" ? defaultValues.id : undefined).then(
        (available) => setSlugStatus(available ? "available" : "taken"),
      );
    }, SLUG_CHECK_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function onSubmit(values: AdminProductValues) {
    const result = await saveProduct(values);

    if (!result.success) {
      for (const fieldError of result.errors) {
        if (fieldError.field in defaultValues) {
          form.setError(fieldError.field as keyof AdminProductValues, {
            message: fieldError.message,
          });
        } else {
          toast.error(fieldError.message);
        }
      }
      return;
    }

    toast.success(mode === "create" ? "Product created." : "Product saved.");
    router.push("/admin/products");
  }

  return (
    <Form {...form}>
      <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} className="flex flex-col gap-6">
        <Tabs defaultValue="albanian">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
            <TabsTrigger value="albanian">Albanian</TabsTrigger>
            <TabsTrigger value="english">English</TabsTrigger>
            <TabsTrigger value="pricing">Pricing &amp; Stock</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="organisation">Organisation</TabsTrigger>
          </TabsList>

          <TabsContent value="albanian" className="pt-4">
            <ProductTranslationFields locale="sq" />
          </TabsContent>

          <TabsContent value="english" className="pt-4">
            <ProductTranslationFields locale="en" />
          </TabsContent>

          <TabsContent value="pricing" className="pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priceCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (cents)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormDescription>2800 = €28.00</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountPriceCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount price (cents, optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(event) =>
                          field.onChange(event.target.value === "" ? null : Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lowStockThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Low stock threshold</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trackInventory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 self-end pb-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Track inventory</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          <TabsContent value="media" className="pt-4">
            <ProductMediaFields productId={defaultValues.id} />
          </TabsContent>

          <TabsContent value="organisation" className="pt-4">
            <div className="flex flex-col gap-5">
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
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value || NO_CATEGORY}
                      onValueChange={(value) => field.onChange(value === NO_CATEGORY ? "" : value)}
                      items={categoryItems}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Featured on the homepage</FormLabel>
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
                    <div className="flex flex-col gap-1">
                      <FormLabel className="font-normal">
                        Active (visible on the storefront)
                      </FormLabel>
                      <p className="text-fg-muted font-body text-xs">
                        Requires at least one image and complete translations in both languages.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Label className="sr-only" htmlFor="save-product">
            Save
          </Label>
          <Button
            id="save-product"
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting || slugStatus === "taken"}
          >
            {form.formState.isSubmitting ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
