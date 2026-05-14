import ReactMarkdown from 'react-markdown';

import { cn } from '@/lib/utils';

const legalLinkClassName = cn(
  'rounded-sm text-primary underline underline-offset-4',
  'transition-colors hover:text-primary/80',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);

export interface LegalDocumentProps {
  content: string;
  jsonLd: Record<string, unknown>;
  /** Keeps article language aligned with the page locale and hreflang code. */
  locale?: string;
  /** Renders below the document title as secondary, muted copy (e.g. last updated). */
  lastUpdatedLine?: string;
}

export function LegalDocument({
  content,
  jsonLd,
  locale,
  lastUpdatedLine,
}: LegalDocumentProps) {
  const articleLang =
    locale === 'zh' ? 'zh' : locale != null ? 'en' : undefined;

  let lastUpdatedPlaced = false;

  return (
    <div className="w-full border-t border-border/60 bg-muted/25 dark:bg-muted/15">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-16 lg:px-8 lg:pt-20">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article
          lang={articleLang}
          className={cn(
            'prose prose-lg max-w-none dark:prose-invert',
            'prose-headings:text-foreground prose-headings:scroll-mt-24',
            'prose-p:text-foreground prose-strong:text-foreground prose-em:text-muted-foreground',
            'prose-li:text-foreground',
            'text-pretty',
          )}
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => {
                const showLastUpdated =
                  Boolean(lastUpdatedLine) && !lastUpdatedPlaced;
                if (showLastUpdated) {
                  lastUpdatedPlaced = true;
                }
                return (
                  <>
                    <h1
                      className={cn(
                        'mt-0 text-balance text-3xl font-bold tracking-tight text-foreground',
                        'sm:text-4xl',
                        showLastUpdated ? 'mb-2 sm:mb-3' : 'mb-10',
                      )}
                    >
                      {children}
                    </h1>
                    {showLastUpdated ? (
                      <p
                        className="mb-8 text-sm leading-relaxed text-muted-foreground tabular-nums sm:mb-10"
                        role="doc-subtitle"
                      >
                        {lastUpdatedLine}
                      </p>
                    ) : null}
                  </>
                );
              },
              h2: ({ children }) => (
                <h2
                  className={cn(
                    'mb-6 mt-12 text-2xl font-semibold tracking-tight text-foreground',
                    'first:mt-0',
                  )}
                >
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-4 mt-8 text-xl font-semibold tracking-tight text-foreground">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="mb-3 mt-6 text-lg font-semibold tracking-tight text-foreground">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-foreground leading-relaxed">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 list-outside list-disc space-y-2 pl-6 text-foreground [&_ul]:my-2 [&_ul]:pl-6">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-4 list-outside list-decimal space-y-2 pl-6 text-foreground [&_ul]:my-2 [&_ul]:pl-6">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="font-normal leading-relaxed text-foreground">
                  {children}
                </li>
              ),
              em: ({ children }) => (
                <em className="italic text-muted-foreground">{children}</em>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">
                  {children}
                </strong>
              ),
              a: ({ href, children }) => {
                const resolved = href ?? '#';
                const isExternal =
                  resolved.startsWith('http://') ||
                  resolved.startsWith('https://');
                return (
                  <a
                    href={resolved}
                    className={legalLinkClassName}
                    {...(isExternal
                      ? { rel: 'noopener noreferrer', target: '_blank' }
                      : {})}
                  >
                    {children}
                  </a>
                );
              },
              hr: () => <hr className="my-8 border-0 border-t border-border" />,
              blockquote: ({ children }) => (
                <blockquote className="my-6 border-l-4 border-primary/25 pl-4 text-muted-foreground [&_p]:mb-0">
                  {children}
                </blockquote>
              ),
              code: ({ className, children, ...props }) => {
                const inline = !className;
                return inline ? (
                  <code
                    className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="mb-4 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                  {children}
                </pre>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
