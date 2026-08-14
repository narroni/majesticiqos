import { getTranslations } from "next-intl/server";

import { Container } from "@/components/shared/container";

interface LegalSection {
  heading: string;
  body: string[];
}

interface LegalPageProps {
  /** "legal.terms" or "legal.privacy" — the namespace holding `title` and `sections`. */
  namespace: "legal.terms" | "legal.privacy";
}

// Shared renderer for /terms and /privacy.
export async function LegalPage({ namespace }: LegalPageProps) {
  const t = await getTranslations();
  const title = t(`${namespace}.title`);
  const sections = t.raw(`${namespace}.sections`) as LegalSection[];

  return (
    <Container className="flex max-w-2xl flex-col gap-10 py-16 lg:py-24">
      <div className="flex flex-col gap-4">
        <h1 className="text-h1 font-display text-fg-primary">{title}</h1>
      </div>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <div key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-h3 font-display text-fg-primary">{section.heading}</h2>
            {section.body.map((paragraph, index) => (
              <p key={index} className="text-fg-secondary font-body text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </Container>
  );
}
