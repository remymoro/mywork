import type { ReactNode } from "react";

type LogoVariantProps = { className?: string };

function LogoWordmark({ children, className = "" }: LogoVariantProps & { children: ReactNode }) {
  return (
    <span className={`font-heading inline-flex items-center gap-1 font-semibold tracking-tight text-foreground ${className ?? ""}`}>
      {children}
    </span>
  );
}

export function LogoMonogramme({ className }: LogoVariantProps) {
  return (
    <LogoWordmark className={className}>
      <span className="relative grid size-[1.45em] place-items-center rounded-sm bg-secondary text-[0.72em] font-bold leading-none text-primary">
        <span className="-translate-x-[0.12em]">M</span>
        <span className="absolute translate-x-[0.24em] translate-y-[0.2em] text-[0.78em]">W</span>
      </span>
      <span>MyWork</span>
    </LogoWordmark>
  );
}

export function LogoMTypo({ className }: LogoVariantProps) {
  return (
    <LogoWordmark className={className}>
      <span className="text-[1.65em] font-normal leading-none text-primary">M</span>
      <span className="-ml-1">yWork</span>
    </LogoWordmark>
  );
}

export function LogoPages({ className }: LogoVariantProps) {
  return (
    <LogoWordmark className={className}>
      <svg
        aria-hidden="true"
        viewBox="0 0 40 32"
        className="h-[1.35em] w-[1.7em] shrink-0 text-primary"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      >
        <path d="M20 7c-5-3-10-3-16-1v20c6-2 11-2 16 2 5-4 10-4 16-2V6c-6-2-11-2-16 1Z" />
        <path d="M20 8v20M8 10c3-.5 6 0 9 1M8 15c3-.5 6 0 9 1" />
        <path d="m22 16 2-3 2 3 2-3 2 3" className="text-foreground" />
      </svg>
      <span>MyWork</span>
    </LogoWordmark>
  );
}

export function LogoNomSeul({ className }: LogoVariantProps) {
  return (
    <LogoWordmark className={`${className ?? ""} gap-0 text-[1.35em] font-normal`}>
      <span className="text-primary">My</span>
      <span className="text-foreground">Work</span>
    </LogoWordmark>
  );
}
