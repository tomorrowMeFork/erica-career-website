declare module "next/link" {
  import type { AnchorHTMLAttributes, ComponentType, RefAttributes } from "react";

  interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, RefAttributes<HTMLAnchorElement> {
    href: string;
    prefetch?: boolean;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    legacyBehavior?: boolean;
  }

  const Link: ComponentType<LinkProps>;
  export default Link;
}

declare module "next/navigation" {
  export function usePathname(): string;
  export function useRouter(): {
    push(href: string): void;
    replace(href: string): void;
    back(): void;
    refresh(): void;
    prefetch(href: string): void;
  };
  export function useSearchParams(): URLSearchParams;
}
