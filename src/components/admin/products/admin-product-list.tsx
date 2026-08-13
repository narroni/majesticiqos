"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteProduct,
  deleteProducts,
  toggleProductActive,
  toggleProductFeatured,
} from "@/lib/actions/admin-products";
import type { AdminProductListItem } from "@/lib/data/admin-products";
import { cn } from "@/lib/cn";
import { STOCK_STATUS_LABEL } from "@/lib/stock-status";
import { formatPrice } from "@/lib/utils";

interface AdminProductListProps {
  products: AdminProductListItem[];
}

type ToggleOverrides = Record<string, Partial<Pick<AdminProductListItem, "isActive" | "isFeatured">>>;

const STOCK_CLASS: Record<AdminProductListItem["stockStatus"], string> = {
  in_stock: "text-success",
  low_stock: "text-warning",
  out_of_stock: "text-danger",
};

const LOCALE_LABEL: Record<"sq" | "en", string> = { sq: "SQ", en: "EN" };

export function AdminProductList({ products }: AdminProductListProps) {
  // Optimistic overrides layered on top of the server-provided list, rather
  // than copying `products` into local state — that would go stale the
  // moment a filter/search navigation brings in a fresh server render.
  const [overrides, setOverrides] = useState<ToggleOverrides>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [, startTransition] = useTransition();

  // Reset selection whenever a new page/filter's product list arrives —
  // adjusting state during render on a prop-identity change, per React's
  // documented pattern (same approach as CartDrawerLoader). Without this,
  // ids selected on page 1 would silently linger, invisible, after
  // navigating to page 2.
  const [knownProducts, setKnownProducts] = useState(products);
  if (products !== knownProducts) {
    setKnownProducts(products);
    setSelectedIds(new Set());
  }

  const visible = products
    .filter((product) => !deletedIds.has(product.id))
    .map((product) => ({ ...product, ...overrides[product.id] }));

  const isAllSelected = visible.length > 0 && visible.every((product) => selectedIds.has(product.id));
  const isPartiallySelected = selectedIds.size > 0 && !isAllSelected;

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visible.map((product) => product.id)) : new Set());
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    setIsBulkDeleting(true);
    const result = await deleteProducts(ids);
    setIsBulkDeleting(false);
    setIsBulkDeleteOpen(false);

    if (result.success) {
      const removed = result.deletedIds ?? ids;
      setDeletedIds((prev) => {
        const next = new Set(prev);
        removed.forEach((id) => next.add(id));
        return next;
      });
      setSelectedIds(new Set());
      toast.success(`${removed.length} ${removed.length === 1 ? "product" : "products"} deleted.`);
    } else {
      toast.error(result.error ?? "Something went wrong.");
    }
  }

  function handleToggle(product: AdminProductListItem, field: "isActive" | "isFeatured", next: boolean) {
    const previous = product[field];
    setOverrides((prev) => ({ ...prev, [product.id]: { ...prev[product.id], [field]: next } }));

    startTransition(async () => {
      const result =
        field === "isActive"
          ? await toggleProductActive(product.id, next)
          : await toggleProductFeatured(product.id, next);

      if (!result.success) {
        setOverrides((prev) => ({ ...prev, [product.id]: { ...prev[product.id], [field]: previous } }));
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    const result = await deleteProduct(id);
    setPendingDeleteId(null);

    if (result.success) {
      setDeletedIds((prev) => new Set(prev).add(id));
      toast.success("Product deleted.");
    } else {
      toast.error(result.error ?? "Something went wrong.");
    }
  }

  if (visible.length === 0) {
    return (
      <p className="text-fg-secondary font-body py-12 text-center text-sm">
        No products match these filters.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {selectedIds.size > 0 ? (
        <div className="border-accent bg-accent/10 flex items-center justify-between gap-4 rounded-md border px-4 py-2.5">
          <span className="text-fg-primary font-body text-sm">
            {selectedIds.size} {selectedIds.size === 1 ? "product" : "products"} selected
          </span>
          <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
            <AlertDialogTrigger
              render={<Button variant="outline" size="sm" disabled={isBulkDeleting} />}
            >
              <Trash2 />
              Delete selected
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.size} {selectedIds.size === 1 ? "product" : "products"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This hides them from the storefront immediately. Past orders that included them
                  are unaffected — nothing is permanently erased.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="border-border hidden overflow-hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isPartiallySelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all products"
                />
              </TableHead>
              <TableHead></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={(checked) => toggleSelectOne(product.id, checked)}
                    aria-label={`Select ${product.nameSq}`}
                  />
                </TableCell>
                <TableCell>
                  <Thumbnail product={product} />
                </TableCell>
                <TableCell className="max-w-56 font-medium whitespace-normal">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate">{product.nameSq}</span>
                    <IncompleteTranslationBadge product={product} />
                  </div>
                </TableCell>
                <TableCell className="text-fg-secondary">
                  {product.categoryName ?? "—"}
                </TableCell>
                <TableCell>
                  <Price product={product} />
                </TableCell>
                <TableCell>
                  <Stock product={product} />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={product.isActive}
                    onCheckedChange={(checked) => handleToggle(product, "isActive", checked)}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={product.isFeatured}
                    onCheckedChange={(checked) => handleToggle(product, "isFeatured", checked)}
                  />
                </TableCell>
                <TableCell>
                  <RowActions
                    product={product}
                    isDeleting={pendingDeleteId === product.id}
                    onDelete={() => handleDelete(product.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {visible.map((product) => (
          <div
            key={product.id}
            className="border-border bg-bg-elevated flex flex-col gap-3 rounded-md border p-4"
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedIds.has(product.id)}
                onCheckedChange={(checked) => toggleSelectOne(product.id, checked)}
                aria-label={`Select ${product.nameSq}`}
                className="mt-1"
              />
              <Thumbnail product={product} />
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-fg-primary font-body text-sm font-medium">
                    {product.nameSq}
                  </span>
                  <IncompleteTranslationBadge product={product} />
                </div>
                <span className="text-fg-secondary font-mono text-xs">
                  {product.categoryName ?? "No category"}
                </span>
                <Price product={product} />
                <Stock product={product} />
              </div>
              <RowActions
                product={product}
                isDeleting={pendingDeleteId === product.id}
                onDelete={() => handleDelete(product.id)}
              />
            </div>

            <div className="border-border flex items-center justify-between border-t pt-3">
              <label className="text-fg-secondary flex items-center gap-2 font-body text-sm">
                <Switch
                  checked={product.isActive}
                  onCheckedChange={(checked) => handleToggle(product, "isActive", checked)}
                />
                Active
              </label>
              <label className="text-fg-secondary flex items-center gap-2 font-body text-sm">
                <Switch
                  checked={product.isFeatured}
                  onCheckedChange={(checked) => handleToggle(product, "isFeatured", checked)}
                />
                Featured
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncompleteTranslationBadge({ product }: { product: AdminProductListItem }) {
  if (product.incompleteLocales.length === 0) {
    return null;
  }

  return (
    <span
      className="bg-warning/10 text-warning shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] leading-none"
      title={`Incomplete translation: ${product.incompleteLocales
        .map((locale) => LOCALE_LABEL[locale])
        .join(", ")}`}
    >
      {product.incompleteLocales.map((locale) => LOCALE_LABEL[locale]).join("/")} incomplete
    </span>
  );
}

function Thumbnail({ product }: { product: AdminProductListItem }) {
  return (
    <div className="bg-bg-subtle relative size-12 shrink-0 overflow-hidden rounded-sm">
      {product.primaryImageUrl ? (
        <Image
          src={product.primaryImageUrl}
          alt={product.nameSq}
          fill
          sizes="48px"
          className="object-cover"
        />
      ) : null}
    </div>
  );
}

function Price({ product }: { product: AdminProductListItem }) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <span className="text-fg-primary">{formatPrice(product.effectivePriceCents, "en")}</span>
      {product.discountPriceCents != null ? (
        <span className="text-fg-muted line-through">
          {formatPrice(product.priceCents, "en")}
        </span>
      ) : null}
    </div>
  );
}

function Stock({ product }: { product: AdminProductListItem }) {
  return (
    <span className={cn("font-mono text-xs", STOCK_CLASS[product.stockStatus])}>
      {product.stockQuantity} · {STOCK_STATUS_LABEL[product.stockStatus]}
    </span>
  );
}

function RowActions({
  product,
  isDeleting,
  onDelete,
}: {
  product: AdminProductListItem;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" disabled={isDeleting} />}
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={`/admin/products/${product.id}/edit`} />}
          >
            <Pencil />
            Edit
          </DropdownMenuItem>
          <AlertDialogTrigger
            nativeButton={false}
            render={<DropdownMenuItem variant="destructive" />}
          >
            <Trash2 />
            Delete
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{product.nameSq}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This hides it from the storefront immediately. Past orders that included it are
            unaffected — nothing is permanently erased.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
