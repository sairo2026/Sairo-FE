import Image from "next/image";
import { cn } from "@/shared/lib/cn";

const LOGOS = {
  horizontal: { src: "/brand/sairo-logo-horizontal.png", width: 960, height: 181 },
  vertical: { src: "/brand/sairo-logo-vertical.png", width: 439, height: 262 },
  symbol: { src: "/brand/sairo-symbol.png", width: 160, height: 160 },
} as const;

export type BrandLogoVariant = keyof typeof LOGOS;

export function BrandLogo({
  variant = "horizontal",
  className,
}: {
  variant?: BrandLogoVariant;
  className?: string;
}) {
  const logo = LOGOS[variant];
  return (
    <Image
      src={logo.src}
      width={logo.width}
      height={logo.height}
      alt="사이로"
      priority
      unoptimized
      className={cn("h-auto", className)}
    />
  );
}
