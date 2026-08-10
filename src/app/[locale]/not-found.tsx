import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/container";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("product");

  return (
    <Container className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-h2 font-display text-fg-primary">
        {t("notFoundTitle")}
      </h1>
      <p className="text-fg-secondary font-body max-w-md">
        {t("notFoundDescription")}
      </p>
      <Button render={<Link href="/products" />} nativeButton={false}>
        {t("backToProducts")}
      </Button>
    </Container>
  );
}
