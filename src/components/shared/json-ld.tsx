// The one sanctioned dangerouslySetInnerHTML use in this codebase
// (CLAUDE.md rule 10 / BLUEPRINT §8.2) — content is always a JSON.stringify
// of an object this codebase built, never user input.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
