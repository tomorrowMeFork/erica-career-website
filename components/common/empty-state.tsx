import * as React from "react";

import { cn } from "../../lib/utils.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card.js";

type EmptyStateProps = Omit<React.ComponentProps<"section">, "title"> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, body, action, className, children, ...props }: EmptyStateProps) {
  return (
    <section className={cn("w-full min-w-0", className)} {...props}>
      <Card className="w-full min-w-0 items-center border-dashed erica-surface-muted text-center">
        <CardHeader className="w-full max-w-2xl min-w-0 items-center gap-3 px-5 sm:px-6">
          {icon ? <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary">{icon}</div> : null}
          <CardTitle className="w-full text-balance break-keep text-2xl font-semibold tracking-tight text-foreground">{title}</CardTitle>
          {body ? <CardDescription className="w-full max-w-xl text-pretty break-keep text-base leading-7 text-muted-foreground">{body}</CardDescription> : null}
        </CardHeader>
        {children ? <CardContent className="w-full max-w-2xl min-w-0 px-5 text-muted-foreground sm:px-6">{children}</CardContent> : null}
        {action ? <CardFooter className="justify-center">{action}</CardFooter> : null}
      </Card>
    </section>
  );
}
