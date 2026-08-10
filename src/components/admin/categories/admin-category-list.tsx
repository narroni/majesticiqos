"use client";

import { ArrowDown, ArrowUp, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  deleteCategory,
  moveCategorySortOrder,
  toggleCategoryActive,
} from "@/lib/actions/admin-categories";
import type { AdminCategoryListItem } from "@/lib/data/admin-categories";

interface AdminCategoryListProps {
  categories: AdminCategoryListItem[];
}

export function AdminCategoryList({ categories: initialCategories }: AdminCategoryListProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [activeOverrides, setActiveOverrides] = useState<Record<string, boolean>>({});
  const [movingId, setMovingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [knownCategories, setKnownCategories] = useState(initialCategories);
  if (initialCategories !== knownCategories) {
    setKnownCategories(initialCategories);
    setCategories(initialCategories);
    setActiveOverrides({});
  }

  const visible = categories.map((category) => ({
    ...category,
    isActive: activeOverrides[category.id] ?? category.isActive,
  }));

  function handleToggleActive(category: AdminCategoryListItem, next: boolean) {
    const previous = category.isActive;
    setActiveOverrides((prev) => ({ ...prev, [category.id]: next }));

    startTransition(async () => {
      const result = await toggleCategoryActive(category.id, next);
      if (!result.success) {
        setActiveOverrides((prev) => ({ ...prev, [category.id]: previous }));
        toast.error(result.error ?? "Something went wrong.");
      }
    });
  }

  async function handleMove(category: AdminCategoryListItem, direction: "up" | "down") {
    setMovingId(category.id);
    const result = await moveCategorySortOrder(category.id, direction);
    setMovingId(null);

    if (!result.success) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }

    // The server is the source of truth for the new order — a page refresh
    // (router.refresh via the parent Server Component re-fetching) would
    // also work, but swapping the two adjacent rows locally is instant and
    // exactly matches what the server just did.
    setCategories((prev) => {
      const index = prev.findIndex((c) => c.id === category.id);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapIndex < 0 || swapIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  async function handleDelete(id: string) {
    const result = await deleteCategory(id);
    setPendingDeleteId(null);

    if (result.success) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Category deleted.");
    } else {
      toast.error(result.error ?? "Something went wrong.");
    }
  }

  if (visible.length === 0) {
    return (
      <p className="text-fg-secondary font-body py-12 text-center text-sm">No categories yet.</p>
    );
  }

  function rowActions(category: AdminCategoryListItem) {
    return (
      <AlertDialog
        open={pendingDeleteId === category.id}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreVertical />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/admin/categories/${category.id}/edit`} />}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <AlertDialogTrigger
              nativeButton={false}
              render={<DropdownMenuItem variant="destructive" />}
              onClick={() => setPendingDeleteId(category.id)}
            >
              <Trash2 />
              Delete
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{category.nameSq}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {category.productCount > 0
                ? `This category still has ${category.productCount} ${category.productCount === 1 ? "product" : "products"} assigned to it — move them to another category first.`
                : "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={category.productCount > 0}
              onClick={() => handleDelete(category.id)}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="border-border hidden overflow-hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>Albanian name</TableHead>
              <TableHead>English name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Order</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((category, index) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="bg-bg-subtle relative size-12 shrink-0 overflow-hidden rounded-sm">
                    {category.imageUrl ? (
                      <Image src={category.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-fg-primary font-medium">{category.nameSq}</TableCell>
                <TableCell className="text-fg-secondary">{category.nameEn}</TableCell>
                <TableCell className="text-fg-muted font-mono text-xs">{category.slug}</TableCell>
                <TableCell className="text-fg-secondary">{category.productCount}</TableCell>
                <TableCell>
                  <Switch
                    checked={category.isActive}
                    onCheckedChange={(checked) => handleToggleActive(category, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Move up"
                      disabled={index === 0 || movingId === category.id}
                      onClick={() => handleMove(category, "up")}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Move down"
                      disabled={index === visible.length - 1 || movingId === category.id}
                      onClick={() => handleMove(category, "down")}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{rowActions(category)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {visible.map((category, index) => (
          <div
            key={category.id}
            className="border-border bg-bg-elevated flex flex-col gap-3 rounded-md border p-4"
          >
            <div className="flex items-start gap-3">
              <div className="bg-bg-subtle relative size-12 shrink-0 overflow-hidden rounded-sm">
                {category.imageUrl ? (
                  <Image src={category.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-fg-primary font-body text-sm font-medium">{category.nameSq}</span>
                <span className="text-fg-secondary font-body text-xs">{category.nameEn}</span>
                <span className="text-fg-muted font-mono text-xs">{category.slug}</span>
                <span className="text-fg-secondary font-body text-xs">
                  {category.productCount} {category.productCount === 1 ? "product" : "products"}
                </span>
              </div>
              {rowActions(category)}
            </div>

            <div className="border-border flex items-center justify-between border-t pt-3">
              <label className="text-fg-secondary flex items-center gap-2 font-body text-sm">
                <Switch
                  checked={category.isActive}
                  onCheckedChange={(checked) => handleToggleActive(category, checked)}
                />
                Active
              </label>
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Move up"
                  disabled={index === 0 || movingId === category.id}
                  onClick={() => handleMove(category, "up")}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Move down"
                  disabled={index === visible.length - 1 || movingId === category.id}
                  onClick={() => handleMove(category, "down")}
                >
                  <ArrowDown />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
