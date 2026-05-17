import { Card, CardContent } from "../ui/card.js";

export function UserMessage({ query }: { query: string }) {
  return (
    <article className="justify-self-end max-w-[min(42rem,92%)]" aria-label="사용자 질문">
      <Card className="rounded-[var(--radius-lg)_var(--radius-lg)_var(--radius-sm)_var(--radius-lg)] border-primary bg-primary py-4 text-primary-foreground shadow-sm">
        <CardContent className="px-5">
          <p className="whitespace-pre-wrap text-sm leading-7 md:text-base">{query}</p>
        </CardContent>
      </Card>
    </article>
  );
}
