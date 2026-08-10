import { Banknote, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Stagger } from "@/components/motion/stagger";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export async function WhyChooseUs() {
  const t = await getTranslations("home.whyChooseUs");

  const items = [
    { icon: Truck, label: t("fastDelivery") },
    { icon: ShieldCheck, label: t("authenticProducts") },
    { icon: Banknote, label: t("cashOnDelivery") },
    { icon: MessageCircle, label: t("albanianSupport") },
  ];

  return (
    <Section>
      <Container className="flex flex-col gap-10">
        <h2 className="text-h2 font-display text-fg-primary text-center">
          {t("heading")}
        </h2>

        <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 text-center"
            >
              <item.icon
                className="text-accent size-6"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span className="text-fg-secondary font-body text-sm">
                {item.label}
              </span>
            </div>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
