"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

type Props = {
  content: string;
  /** For one-line contexts (e.g. checklist labels): avoids nested block nodes. */
  inline?: boolean;
  className?: string;
};

function mdComponents(inline: boolean): Components {
  const emphasis: Components = {
    strong: ({ children }) => (
      <strong className="font-semibold text-[var(--foreground)]">
        {children}
      </strong>
    ),
    em: ({ children }) => (
      <em className="text-[var(--foreground)]/90 italic">{children}</em>
    ),
    code: ({ className, children }) =>
      className?.trim() ? (
        <code className="block font-mono text-sm text-[var(--foreground)]">
          {children}
        </code>
      ) : (
        <code className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--foreground)]">
          {children}
        </code>
      ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[var(--accent)] underline-offset-2 hover:underline"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="my-2 list-inside list-disc space-y-1 pl-0.5">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-inside list-decimal space-y-1 pl-0.5">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="text-inherit">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-[3px] border-[var(--accent)] pl-3 text-[var(--foreground)]/90">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-4 border-[var(--border)]" />,
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm leading-relaxed">
        {children}
      </pre>
    ),
  };

  const taskHeadingClass =
    "mt-4 mb-2 text-base font-semibold tracking-tight text-[var(--foreground)] first:mt-0";

  if (inline) {
    return {
      ...emphasis,
      h1: ({ children }) => <h2 className={taskHeadingClass}>{children}</h2>,
      h2: ({ children }) => <h2 className={taskHeadingClass}>{children}</h2>,
      h3: ({ children }) => <h3 className={taskHeadingClass}>{children}</h3>,
      p: ({ children }) => <span className="text-inherit">{children}</span>,
    };
  }

  return {
    ...emphasis,
    h1: ({ children }) => <h2 className={taskHeadingClass}>{children}</h2>,
    h2: ({ children }) => <h2 className={taskHeadingClass}>{children}</h2>,
    h3: ({ children }) => <h3 className={taskHeadingClass}>{children}</h3>,
    p: ({ children }) => (
      <p className="mb-3 text-inherit leading-relaxed last:mb-0">{children}</p>
    ),
  };
}

export function LearningRichText({
  content,
  inline = false,
  className,
}: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={mdComponents(inline)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
