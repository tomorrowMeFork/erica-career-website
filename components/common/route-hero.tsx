import * as React from "react";

import { cn } from "../../lib/utils.js";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "../ui/card.js";

type RouteHeroProps = Omit<React.ComponentProps<"section">, "title"> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  titleId?: string;
};

export function RouteHero({ eyebrow, title, description, actions, titleId, className, children, ...props }: RouteHeroProps) {
  const headingId = titleId ?? props["aria-labelledby"];

  return (
    <section className={cn("w-full", className)} aria-labelledby={headingId} {...props}>
      <Card className="relative overflow-hidden border-border/80 bg-card/95 text-card-foreground shadow-[var(--shadow-soft)] ring-1 ring-primary/10 after:pointer-events-none after:absolute after:-right-16 after:-top-20 after:size-56 after:rounded-full after:bg-secondary after:opacity-55 after:blur-2xl">
        <CardHeader className="relative z-10 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="grid gap-3">
            {eyebrow ? <p className="w-fit rounded-full border border-primary/20 bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}
            <CardTitle>
              <h1 id={headingId} className="max-w-4xl text-4xl font-bold tracking-[-0.04em] text-foreground md:text-5xl">
                {title}
              </h1>
            </CardTitle>
            {description ? <CardDescription className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">{description}</CardDescription> : null}
          </div>
          {actions ? <CardAction className="static col-auto row-auto justify-self-start md:justify-self-end">{actions}</CardAction> : null}
        </CardHeader>
        {children}
      </Card>
    </section>
  );
}
