import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/shared/components/ui/brand-logo";
import { cn } from "@/shared/lib/cn";
import {
  CLOSING_COPY,
  ENTRY_LINKS,
  FAQ_COPY,
  FEATURE_COPY,
  HERO_COPY,
  LANDING_SECTIONS,
  PRICING_SECTION_COPY,
  STEP_COPY,
  VALUE_COPY,
} from "../model/landing-copy";
import { LogoSplash } from "./logo-splash";

const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";
const SECTION = "py-14 sm:py-20";
const SECTION_TITLE = "text-h1 font-bold text-ink";
const SECTION_LEAD = "mt-3 max-w-2xl text-body text-ink-2";

const ENTRY_TONE = {
  primary: "bg-primary font-bold text-white hover:bg-primary-hover active:bg-primary-pressed",
  outlined:
    "border border-primary bg-primary-soft font-semibold text-primary hover:bg-primary-line",
  ghost:
    "border border-line bg-white font-medium text-ink-2 hover:border-primary hover:text-primary",
} as const;

function EntryLink({
  href,
  tone,
  size = "md",
  children,
}: {
  href: string;
  tone: keyof typeof ENTRY_TONE;
  size?: "md" | "sm";
  children: ReactNode;
}) {
  const className = cn(
    "inline-flex items-center justify-center rounded-control transition-colors",
    size === "md" ? "min-h-12 px-6 text-body" : "min-h-10 px-4 text-caption",
    ENTRY_TONE[tone],
  );
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 h-5 w-5 shrink-0 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="8" />
      <path d="m6.5 10.2 2.4 2.4 4.6-5" />
    </svg>
  );
}

export type LandingPageProps = {
  pricing: ReactNode;
  footer: ReactNode;
};

export function LandingPage({ pricing, footer }: LandingPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink">
      <LogoSplash />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-40 focus:rounded-control focus:bg-white focus:px-4 focus:py-3 focus:text-body focus:font-semibold focus:text-primary"
      >
        본문으로 건너뛰기
      </a>
      <header className="border-b border-line">
        <div className={cn(CONTAINER, "flex items-center justify-between gap-4 py-4")}>
          <Link href="/" aria-label="사이로 첫 화면">
            <BrandLogo className="w-24 sm:w-28" />
          </Link>
          <nav aria-label="첫 화면 메뉴" className="hidden md:block">
            <ul className="flex items-center gap-7 text-caption font-semibold text-ink-2">
              {LANDING_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-10 items-center hover:text-primary"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <EntryLink href={ENTRY_LINKS.login.href} tone="ghost" size="sm">
              {ENTRY_LINKS.login.label}
            </EntryLink>
            <EntryLink href={ENTRY_LINKS.signup.href} tone="primary" size="sm">
              {ENTRY_LINKS.signup.label}
            </EntryLink>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section aria-labelledby="hero-title" className="bg-surface">
          <div
            className={cn(
              CONTAINER,
              "grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-16",
            )}
          >
            <div>
              <p className="text-caption font-semibold text-primary">{HERO_COPY.eyebrow}</p>
              <h1
                id="hero-title"
                className="mt-3 break-keep text-h1 font-bold text-ink sm:text-display"
              >
                {HERO_COPY.title}
              </h1>
              <p className="mt-5 max-w-xl break-keep text-body text-ink-2">{HERO_COPY.body}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <EntryLink href={ENTRY_LINKS.signup.href} tone="primary">
                  가입하고 시작하기
                </EntryLink>
                <EntryLink href={ENTRY_LINKS.pricing.href} tone="outlined">
                  {ENTRY_LINKS.pricing.label}
                </EntryLink>
                <EntryLink href={ENTRY_LINKS.enterprise.href} tone="ghost">
                  {ENTRY_LINKS.enterprise.label}
                </EntryLink>
              </div>
            </div>
            <div className="rounded-card border border-primary-line bg-white px-6 py-7 shadow-popup sm:px-8">
              <p className="text-h2 font-semibold text-ink">{HERO_COPY.checkTitle}</p>
              <ul className="mt-5 flex flex-col gap-4">
                {HERO_COPY.checks.map((item) => (
                  <li key={item} className="flex gap-3 text-body text-ink">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-control bg-primary-soft px-4 py-3 text-caption text-ink-2">
                {HERO_COPY.checkNote}
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="value-title" className={SECTION}>
          <div className={CONTAINER}>
            <h2 id="value-title" className={cn(SECTION_TITLE, "max-w-2xl break-keep")}>
              {VALUE_COPY.title}
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {VALUE_COPY.items.map((item) => (
                <li
                  key={item.title}
                  className="rounded-card-flat border border-line bg-white px-6 py-6"
                >
                  <h3 className="text-h2 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-3 text-body text-ink-2">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-title"
          className={cn(SECTION, "bg-surface")}
        >
          <div className={CONTAINER}>
            <h2 id="features-title" className={SECTION_TITLE}>
              {FEATURE_COPY.title}
            </h2>
            <p className={SECTION_LEAD}>{FEATURE_COPY.body}</p>
            <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {FEATURE_COPY.items.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col rounded-card-flat border border-line bg-white px-6 py-6"
                >
                  <h3 className="text-h2 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-3 text-body text-ink-2">{item.body}</p>
                  <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                    {item.points.map((point) => (
                      <li key={point} className="flex gap-2 text-caption text-ink">
                        <CheckIcon />
                        <span className="pt-0.5">{point}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className={SECTION}>
          <div className={CONTAINER}>
            <h2 id="how-title" className={SECTION_TITLE}>
              {STEP_COPY.title}
            </h2>
            <p className={SECTION_LEAD}>{STEP_COPY.body}</p>
            <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {STEP_COPY.items.map((item, index) => (
                <li
                  key={item.title}
                  className="rounded-card-flat border border-line bg-white px-6 py-6"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-body font-bold text-white"
                  >
                    {index + 1}
                  </span>
                  <h3 className="mt-4 break-keep text-h2 font-semibold text-ink">{item.title}</h3>
                  <p className="mt-3 text-body text-ink-2">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" aria-labelledby="pricing-title" className={cn(SECTION, "bg-surface")}>
          <div className={CONTAINER}>
            <h2 id="pricing-title" className={SECTION_TITLE}>
              {PRICING_SECTION_COPY.title}
            </h2>
            <p className={SECTION_LEAD}>{PRICING_SECTION_COPY.body}</p>
            <div className="mt-8">{pricing}</div>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-title" className={SECTION}>
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 id="faq-title" className={SECTION_TITLE}>
              {FAQ_COPY.title}
            </h2>
            <div className="mt-8 flex flex-col gap-3">
              {FAQ_COPY.items.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-card-flat border border-line bg-white px-6"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-body font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="h-5 w-5 shrink-0 text-ink-2 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 7.5 5 5 5-5" />
                    </svg>
                  </summary>
                  <div className="border-t border-line py-4 text-body text-ink-2">
                    <p>{item.answer}</p>
                    {item.link ? (
                      <p className="mt-3">
                        <Link
                          href={item.link.href}
                          className="font-semibold text-primary underline"
                        >
                          {item.link.label}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="closing-title" className="bg-primary-pressed">
          <div
            className={cn(
              CONTAINER,
              "flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between",
            )}
          >
            <div>
              <h2 id="closing-title" className="break-keep text-h1 font-bold text-white">
                {CLOSING_COPY.title}
              </h2>
              <p className="mt-3 text-body text-white">{CLOSING_COPY.body}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={ENTRY_LINKS.signup.href}
                className="inline-flex min-h-12 items-center justify-center rounded-control bg-white px-6 text-body font-bold text-primary hover:bg-primary-soft"
              >
                {ENTRY_LINKS.signup.label}
              </Link>
              <Link
                href={ENTRY_LINKS.enterprise.href}
                className="inline-flex min-h-12 items-center justify-center rounded-control border border-white px-6 text-body font-semibold text-white hover:bg-primary-hover"
              >
                {ENTRY_LINKS.enterprise.label}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface px-4 py-8 sm:px-8">{footer}</footer>
    </div>
  );
}
