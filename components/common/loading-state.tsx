import * as React from "react";

import { cn } from "../../lib/utils.js";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert.js";
import { Skeleton } from "../ui/skeleton.js";

type LoadingStateProps = React.ComponentProps<"div"> & {
  title?: React.ReactNode;
  statusText?: React.ReactNode;
  mode?: "skeleton" | "alert";
};

export function LoadingState({ title = "정보를 확인하고 있어요", statusText = "관련 출처를 확인하고 답변을 준비하고 있어요…", mode = "skeleton", className, ...props }: LoadingStateProps) {
  if (mode === "alert") {
    return (
      <Alert role="status" aria-live="polite" className={cn("erica-surface-muted", className)} {...props}>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{statusText}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div role="status" aria-live="polite" className={cn("grid gap-3 border erica-surface-muted p-6", className)} {...props}>
      <p className="text-sm font-medium text-foreground">{statusText}</p>
      <div className="grid gap-2" aria-hidden="true">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
