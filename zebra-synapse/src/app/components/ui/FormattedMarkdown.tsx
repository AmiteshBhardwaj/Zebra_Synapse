import React from "react";

export function FormattedMarkdown({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="my-2 space-y-1.5 pl-4 list-disc marker:text-lime-600"
        >
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const parseInline = (text: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // 1. Bold: **text**
      const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*(.*)/s);
      if (boldMatch) {
        if (boldMatch[1]) tokens.push(boldMatch[1]);
        tokens.push(
          <strong key={`b-${keyIdx++}`} className="font-bold text-slate-900">
            {parseInline(boldMatch[2])}
          </strong>
        );
        remaining = boldMatch[3];
        continue;
      }

      // 2. Italic: *text* (when not part of **)
      const italicMatch = remaining.match(/^(.*?)\*(.*?)\*(.*)/s);
      if (italicMatch && italicMatch[2].length > 0) {
        if (italicMatch[1]) tokens.push(italicMatch[1]);
        tokens.push(
          <em key={`i-${keyIdx++}`} className="italic text-slate-700 font-serif">
            {italicMatch[2]}
          </em>
        );
        remaining = italicMatch[3];
        continue;
      }

      // 3. Inline code: `text`
      const codeMatch = remaining.match(/^(.*?)\`(.*?)\`(.*)/s);
      if (codeMatch) {
        if (codeMatch[1]) tokens.push(codeMatch[1]);
        tokens.push(
          <code
            key={`c-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-lime-800 font-semibold border border-slate-200"
          >
            {codeMatch[2]}
          </code>
        );
        remaining = codeMatch[3];
        continue;
      }

      tokens.push(remaining);
      break;
    }

    return tokens;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 1. Headers: ### Header or ## Header or # Header
    if (/^#{1,4}\s+/.test(trimmed)) {
      flushList();
      const headerText = trimmed.replace(/^#{1,4}\s+/, "");
      elements.push(
        <h3
          key={`h-${index}`}
          className="text-sm sm:text-base font-bold text-slate-900 mt-3 mb-1.5 font-['Manrope'] border-b border-slate-100 pb-1"
        >
          {parseInline(headerText)}
        </h3>
      );
      return;
    }

    // 2. Bullet list items: starting with "• ", "* ", "- ", or "1. "
    const listMatch = trimmed.match(/^([•\*\-]|(\d+\.))\s+(.*)/);
    if (listMatch) {
      inList = true;
      listItems.push(
        <li key={`li-${index}`} className="text-slate-800 leading-relaxed text-xs sm:text-sm">
          {parseInline(listMatch[3])}
        </li>
      );
      return;
    }

    // 3. Normal line / paragraph break
    flushList();

    if (trimmed === "") {
      elements.push(<div key={`sp-${index}`} className="h-1.5" />);
    } else {
      elements.push(
        <p key={`p-${index}`} className="leading-relaxed text-slate-800 my-0.5 text-xs sm:text-sm">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList();

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
}
