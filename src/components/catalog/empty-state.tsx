import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function EmptyState() {
  const t = await getTranslations("catalog");

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-fg-secondary font-body text-lg">{t("noResults")}</p>
      <Button
        render={<Link href="/products" />}
        nativeButton={false}
        variant="outline"
      >
        {t("clearFilters")}
      </Button>
    </div>
  );
}
