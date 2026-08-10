import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-h2 font-display text-fg-primary">Not found</h1>
      <p className="text-fg-secondary font-body text-sm">
        This admin page doesn&apos;t exist or was removed.
      </p>
      <Button render={<Link href="/admin/products" />} nativeButton={false}>
        Back to products
      </Button>
    </div>
  );
}
