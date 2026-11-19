export type MinutesFormatKind = 'bold' | 'italic' | 'bullet' | 'ordered' | 'heading';

export interface TextSelectionRange {
  start: number;
  end: number;
}

const COMPLEX_HTML_REGEX = /<\s*(table|blockquote|a|u|s|del|strike|hr|sup|sub|font|h4)\b/i;

export function hasComplexHtml(html?: string | null): boolean {
  if (!html || !html.trim()) return false;
  return COMPLEX_HTML_REGEX.test(html);
}

function decodeEntities(text: string): string {
  return text
    .replace(/\u200B/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&bull;/gi, '•')
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number(dec);
      return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCharCode(code) : '';
    });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineHtmlToMarkers(fragment: string): string {
  let out = fragment
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => {
      const trimmed = inlineHtmlToMarkers(inner).trim();
      return trimmed ? `**${trimmed}**` : '';
    })
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => {
      const trimmed = inlineHtmlToMarkers(inner).trim();
      return trimmed ? `*${trimmed}*` : '';
    })
    .replace(/<[^>]+>/g, '');

  out = decodeEntities(out);
  return out
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();
}

export function htmlToStructuredText(html?: string | null): string {
  if (!html || !html.trim()) return '';

  let working = html
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\u200B/g, '');

  // If HTML has no block/inline tags, return decoded plain text directly
  if (!/<[a-z][\s\S]*>/i.test(working)) {
    return decodeEntities(working).trim();
  }

  // Convert tables cleanly row-by-row if user opted to flatten complex HTML
  working = working.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, tableInner: string) => {
    const rowLines: string[] = [];
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = rowRegex.exec(tableInner)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = cellRegex.exec(rMatch[1])) !== null) {
        const cellText = inlineHtmlToMarkers(cMatch[2]).replace(/\n+/g, ' ');
        cells.push(cellText);
      }
      if (cells.length > 0) {
        rowLines.push(cells.join(' | '));
      }
    }
    return rowLines.length > 0 ? `\n\n${rowLines.join('\n')}\n\n` : '\n\n';
  });

  working = working
    .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
    .replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner: string) => {
      const clean = inlineHtmlToMarkers(inner);
      return clean ? `\n\n${clean}\n\n` : '\n\n';
    })
    .replace(/<(h1|h2)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => {
      const text = inlineHtmlToMarkers(inner).replace(/\n+/g, ' ').trim();
      return text ? `\n\n# ${text}\n\n` : '\n\n';
    })
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner: string) => {
      const text = inlineHtmlToMarkers(inner).replace(/\n+/g, ' ').trim();
      return text ? `\n\n## ${text}\n\n` : '\n\n';
    })
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_, inner: string) => {
      const text = inlineHtmlToMarkers(inner).replace(/\n+/g, ' ').trim();
      return text ? `\n\n### ${text}\n\n` : '\n\n';
    })
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, listInner: string) => {
      const items: string[] = [];
      const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRegex.exec(listInner)) !== null) {
        const itemText = inlineHtmlToMarkers(liMatch[1]).replace(/\n+/g, ' ').trim();
        if (itemText) items.push(`- ${itemText}`);
      }
      return items.length > 0 ? `\n\n${items.join('\n')}\n\n` : '\n\n';
    })
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, listInner: string) => {
      const items: string[] = [];
      const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      let idx = 1;
      while ((liMatch = liRegex.exec(listInner)) !== null) {
        const itemText = inlineHtmlToMarkers(liMatch[1]).replace(/\n+/g, ' ').trim();
        if (itemText) items.push(`${idx++}. ${itemText}`);
      }
      return items.length > 0 ? `\n\n${items.join('\n')}\n\n` : '\n\n';
    })
    .replace(/<(p|div)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, inner: string) => {
      const text = inlineHtmlToMarkers(inner);
      return text ? `\n\n${text}\n\n` : '\n\n';
    });

  // Fallback for any trailing unwrapped inline HTML
  working = inlineHtmlToMarkers(working);

  return working
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatInlineMarkersToHtml(line: string): string {
  let escaped = escapeHtml(line);
  // Bold: **text**
  escaped = escaped.replace(/\*\*(?!\s)([^\n*]+?)(?<!\s)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* (not touching already emitted tags or standalone asterisks)
  escaped = escaped.replace(/(^|[^*])\*(?!\s|\*)([^\n*]+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>');
  return escaped;
}

export function structuredTextToHtml(text?: string | null): string {
  if (!text || !text.trim()) return '';

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const htmlBlocks: string[] = [];
  let paragraphLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const joined = paragraphLines.map(formatInlineMarkersToHtml).join('<br>');
    htmlBlocks.push(`<p>${joined}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    const itemsHtml = listItems.map((item) => `<li>${formatInlineMarkersToHtml(item)}</li>`).join('');
    htmlBlocks.push(`<${listType}>${itemsHtml}</${listType}>`);
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushParagraph();
      flushList();
      htmlBlocks.push(`<h4>${formatInlineMarkersToHtml(h3Match[1].trim())}</h4>`);
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushParagraph();
      flushList();
      htmlBlocks.push(`<h3>${formatInlineMarkersToHtml(h2Match[1].trim())}</h3>`);
      continue;
    }

    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      flushParagraph();
      flushList();
      htmlBlocks.push(`<h2>${formatInlineMarkersToHtml(h1Match[1].trim())}</h2>`);
      continue;
    }

    const ulMatch = trimmed.match(/^[-•]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1].trim());
      continue;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1].trim());
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return htmlBlocks.join('\n');
}

export function appendNoteToHtml(existingHtml?: string | null, noteText?: string | null): string {
  const base = (existingHtml ?? '').trim();
  const noteHtml = structuredTextToHtml(noteText);
  if (!noteHtml) return base;
  if (!base) return noteHtml;
  return `${base}\n${noteHtml}`;
}

export function htmlToReadablePreview(html?: string | null): string {
  return htmlToStructuredText(html)
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

export function applyFormatMarker(
  text: string,
  selection: TextSelectionRange,
  kind: MinutesFormatKind,
): { nextText: string; nextSelection: TextSelectionRange } {
  const safeStart = Math.max(0, Math.min(selection.start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(selection.end, text.length));

  if (kind === 'bold' || kind === 'italic') {
    const token = kind === 'bold' ? '**' : '*';
    const selected = text.slice(safeStart, safeEnd);

    if (selected.length > 0) {
      if (selected.startsWith(token) && selected.endsWith(token) && selected.length > token.length * 2) {
        const unwrapped = selected.slice(token.length, selected.length - token.length);
        const nextText = text.slice(0, safeStart) + unwrapped + text.slice(safeEnd);
        return {
          nextText,
          nextSelection: { start: safeStart, end: safeStart + unwrapped.length },
        };
      }
      const wrapped = `${token}${selected}${token}`;
      const nextText = text.slice(0, safeStart) + wrapped + text.slice(safeEnd);
      return {
        nextText,
        nextSelection: { start: safeStart, end: safeStart + wrapped.length },
      };
    }

    const placeholder = kind === 'bold' ? 'teks tebal' : 'teks miring';
    const insertion = `${token}${placeholder}${token}`;
    const nextText = text.slice(0, safeStart) + insertion + text.slice(safeEnd);
    return {
      nextText,
      nextSelection: {
        start: safeStart + token.length,
        end: safeStart + token.length + placeholder.length,
      },
    };
  }

  // Line-based formatting: bullet ('- '), ordered ('1. '), heading ('## ')
  const lineStart = text.lastIndexOf('\n', Math.max(0, safeStart - 1)) + 1;
  const lineEndRaw = text.indexOf('\n', safeEnd);
  const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
  const block = text.slice(lineStart, lineEnd);
  const blockLines = block.split('\n');

  const prefixRegex = /^(?:##\s+|#\s+|###\s+|-\s+|\d+[.)]\s+)/;
  let num = 1;
  const updatedLines = blockLines.map((line) => {
    if (kind === 'bullet') {
      if (line.startsWith('- ')) return line.slice(2);
      return `- ${line.replace(prefixRegex, '')}`;
    }
    if (kind === 'ordered') {
      if (/^\d+[.)]\s+/.test(line)) return line.replace(/^\d+[.)]\s+/, '');
      return `${num++}. ${line.replace(prefixRegex, '')}`;
    }
    // heading
    if (line.startsWith('## ')) return line.slice(3);
    return `## ${line.replace(prefixRegex, '')}`;
  });

  const replacement = updatedLines.join('\n');
  const nextText = text.slice(0, lineStart) + replacement + text.slice(lineEnd);
  const caret = lineStart + replacement.length;
  return {
    nextText,
    nextSelection: { start: caret, end: caret },
  };
}
