import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { Stagger } from "@/components/motion/stagger";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";

export async function WhyChooseUs() {
  const t = await getTranslations("home.whyChooseUs");

  const items = [
    { number: "01", label: t("fastDelivery") },
    { number: "02", label: t("authenticProducts") },
    { number: "03", label: t("cashOnDelivery") },
    { number: "04", label: t("albanianSupport") },
  ];

  return (
    <Section>
      <Container className="flex flex-col gap-10">
        <Reveal className="block">
          <h2 className="text-h2 font-display text-fg-primary text-center">
            {t("heading")}
          </h2>
        </Reveal>

        <Stagger className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 text-center"
            >
              <span className="text-accent font-mono text-h3 tracking-[0.2em]" aria-hidden="true">
                {item.number}
              </span>
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
