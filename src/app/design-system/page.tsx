import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/shared/container";
import { Section } from "@/components/shared/section";
import { SectionHeading } from "@/components/shared/section-heading";
import { Stagger } from "@/components/motion/stagger";
import { FormDemo } from "@/app/design-system/form-demo";

const TEST_STRING = "PËRKUJDESJE ÇANTA ËMBËLSIRË";

const colorTokens = [
  { name: "bg-base", className: "bg-bg-base", hex: "#0A0A0B" },
  { name: "bg-elevated", className: "bg-bg-elevated", hex: "#141416" },
  { name: "bg-subtle", className: "bg-bg-subtle", hex: "#1C1C20" },
  { name: "border", className: "bg-border", hex: "#26262B" },
  { name: "border-strong", className: "bg-border-strong", hex: "#3A3A42" },
  { name: "fg-primary", className: "bg-fg-primary", hex: "#FFFFFF" },
  { name: "fg-secondary", className: "bg-fg-secondary", hex: "#A1A1AA" },
  { name: "fg-muted", className: "bg-fg-muted", hex: "#6B6B75" },
  { name: "accent", className: "bg-accent", hex: "#00D4FF" },
  { name: "accent-hover", className: "bg-accent-hover", hex: "#33DDFF" },
  { name: "success", className: "bg-success", hex: "#4ADE80" },
  { name: "warning", className: "bg-warning", hex: "#FBBF24" },
  { name: "danger", className: "bg-danger", hex: "#F87171" },
  { name: "sale", className: "bg-sale", hex: "#FACC15" },
] as const;

const typeScale = [
  { name: "display-xl", className: "text-display-xl font-display" },
  { name: "display", className: "text-display font-display" },
  { name: "h1", className: "text-h1 font-display" },
  { name: "h2", className: "text-h2 font-display" },
  { name: "h3", className: "text-h3 font-display" },
  { name: "body-lg", className: "text-body-lg font-body" },
  { name: "body", className: "text-body font-body" },
  { name: "sm", className: "text-sm font-body" },
  { name: "xs", className: "text-xs font-mono uppercase" },
] as const;

const radii = [
  {
    name: "radius-sm",
    className: "rounded-sm",
    note: "4px — inputs, buttons",
  },
  { name: "radius-md", className: "rounded-md", note: "8px — cards" },
  { name: "radius-lg", className: "rounded-lg", note: "16px — modals" },
] as const;

const buttonVariants = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

const buttonSizes = ["xs", "sm", "default", "lg"] as const;
const iconSizes = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const;

const reviewCards = [
  {
    title: "First",
    description: "Reveals immediately.",
  },
  {
    title: "Second",
    description: "Reveals 60ms after the first.",
  },
  {
    title: "Third",
    description: "Reveals 120ms after the first.",
  },
] as const;

function ReviewBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border flex flex-col gap-4 border-b pb-12">
      <h2 className="text-h3 font-display">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12">
      <h1 className="text-h1 font-display">Design system review</h1>

      <ReviewBlock title="Colour tokens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {colorTokens.map((token) => (
            <div key={token.name} className="flex flex-col gap-2">
              <div
                className={`border-border h-20 rounded-md border ${token.className}`}
              />
              <div className="font-body flex flex-col text-sm">
                <span>{token.name}</span>
                <span className="text-fg-muted font-mono">{token.hex}</span>
              </div>
            </div>
          ))}
        </div>
      </ReviewBlock>

      <ReviewBlock title="Type scale">
        <div className="flex flex-col gap-6">
          {typeScale.map((type) => (
            <div key={type.name} className="flex flex-col gap-1">
              <span className="text-fg-muted font-mono text-xs tracking-[0.15em] uppercase">
                {type.name}
              </span>
              <span className={type.className}>{TEST_STRING}</span>
            </div>
          ))}
        </div>
      </ReviewBlock>

      <ReviewBlock title="Radii">
        <div className="flex flex-wrap gap-6">
          {radii.map((radius) => (
            <div key={radius.name} className="flex flex-col items-center gap-2">
              <div
                className={`border-border-strong bg-bg-elevated h-24 w-24 border ${radius.className}`}
              />
              <div className="font-body flex flex-col items-center text-sm">
                <span>{radius.name}</span>
                <span className="text-fg-muted">{radius.note}</span>
              </div>
            </div>
          ))}
        </div>
      </ReviewBlock>

      <ReviewBlock title="Buttons — variants">
        <div className="flex flex-wrap items-center gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </ReviewBlock>

      <ReviewBlock title="Buttons — sizes">
        <div className="flex flex-wrap items-center gap-3">
          {buttonSizes.map((size) => (
            <Button key={size} size={size}>
              {size}
            </Button>
          ))}
          {iconSizes.map((size) => (
            <Button key={size} size={size} aria-label={size}>
              <Star />
            </Button>
          ))}
        </div>
      </ReviewBlock>

      <ReviewBlock title="Layout primitives — Container / Section">
        <p className="text-fg-muted text-sm">
          Dashed line marks the Container edge (1440px max-width, responsive
          horizontal padding). Solid border marks the Section edge (responsive
          vertical padding).
        </p>
        <Section background="elevated" className="border-border border">
          <Container>
            <div className="border-accent font-body text-fg-secondary border border-dashed p-4 text-sm">
              Container content — this box sits flush against the
              Container&apos;s padding. Section padding above/below is the real
              64 / 96 / 128px scale — resize the window to see it change.
            </div>
          </Container>
        </Section>
      </ReviewBlock>

      <ReviewBlock title="Layout primitives — SectionHeading">
        <div className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Eyebrow label"
            title="Left aligned heading"
            description="Supporting line in fg-secondary, wraps up to a max width."
            align="left"
            action={<Button variant="outline">View all</Button>}
          />
          <SectionHeading
            eyebrow="Eyebrow label"
            title="Center aligned heading"
            description="Supporting line in fg-secondary, wraps up to a max width."
            align="center"
          />
        </div>
      </ReviewBlock>

      <ReviewBlock title="Motion — Reveal / Stagger">
        <p className="text-fg-muted text-sm">
          Refresh the page and scroll this block into view to watch each card
          reveal 60ms after the previous one.
        </p>
        <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {reviewCards.map((card) => (
            <Card key={card.title}>
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-fg-secondary text-sm">
                {TEST_STRING}
              </CardContent>
            </Card>
          ))}
        </Stagger>
      </ReviewBlock>

      <ReviewBlock title="Form">
        <p className="text-fg-muted text-sm">
          Submit empty to see the error state and message wiring. Fill in a
          valid name, category and (optional) notes to see it clear.
        </p>
        <FormDemo />
      </ReviewBlock>
    </main>
  );
}
