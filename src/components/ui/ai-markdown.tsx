import ReactMarkdown from "react-markdown";

/**
 * Renders AI-generated text (chat replies, career/relationship insights,
 * report bodies) as actual formatting instead of literal markdown — found
 * live: the model reliably writes "**bold**"/numbered/bulleted structure
 * (nothing in policy.ts asks it to, it just does), and every surface was
 * rendering that as raw asterisks/list syntax in a plain <p> instead of
 * real bold/lists. Renders to real React elements (not
 * dangerouslySetInnerHTML), so this carries no injection risk beyond what
 * plain text already had.
 *
 * Kept deliberately plain (no prose/typography plugin dependency) — just
 * enough element styling to match each call site's existing text-sm,
 * leading-relaxed look while turning bold/numbered/bulleted markdown
 * syntax into real emphasis and lists.
 */
export function AiMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed [&>*:not(:first-child)]:mt-2 ${className ?? ""}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
