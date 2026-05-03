export function UserMessage({ query }: { query: string }) {
  return <article className="user-message"><p>{query}</p></article>;
}
