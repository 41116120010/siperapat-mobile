import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { rounded, spacing } from '../../../core/theme/tokens';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { useFeedbackStore } from '../../store/useFeedbackStore';

interface SimpleHtmlViewProps {
  html?: string | null;
  style?: ViewStyle;
}

type BlockNode =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; content: string }
  | { type: 'paragraph'; content: string }
  | { type: 'listItem'; ordered: boolean; index: number; depth: number; content: string }
  | { type: 'blockquote'; content: string }
  | { type: 'hr' }
  | { type: 'table'; rows: TableRowData[] };

interface TableCellData {
  isHeader: boolean;
  colspan: number;
  content: string;
}

interface TableRowData {
  cells: TableCellData[];
}

export function decodeHtmlEntities(text: string): string {
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

function isSafeHttpUrl(rawHref?: string | null): string | null {
  if (!rawHref) return null;
  const decoded = decodeHtmlEntities(rawHref).trim();
  if (/^https?:\/\/\S+$/i.test(decoded)) {
    return decoded;
  }
  return null;
}

async function openExternalLink(url: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Tautan tidak dapat dibuka pada perangkat ini.',
      });
      return;
    }
    await Linking.openURL(url);
  } catch {
    useFeedbackStore.getState().showToast({
      type: 'error',
      message: 'Gagal membuka tautan eksternal.',
    });
  }
}

function renderInline(fragment: string, keyPrefix: string, baseStyle?: TextStyle): React.ReactNode[] {
  const normalized = fragment.replace(/<br\s*\/?>/gi, '\n');
  const tokens = normalized.split(/(<\/?(?:strong|b|em|i|u|s|del|strike|sup|sub|a)\b[^>]*>)/gi);
  const nodes: React.ReactNode[] = [];

  let boldCount = 0;
  let italicCount = 0;
  let underlineCount = 0;
  let strikeCount = 0;
  let supSubCount = 0;
  const linkStack: Array<string | null> = [];

  tokens.forEach((part, index) => {
    if (!part) return;
    const lower = part.toLowerCase();

    if (/^<(strong|b)(\s|>)/.test(lower)) { boldCount++; return; }
    if (/^<\/(strong|b)>/.test(lower)) { boldCount = Math.max(0, boldCount - 1); return; }
    if (/^<(em|i)(\s|>)/.test(lower)) { italicCount++; return; }
    if (/^<\/(em|i)>/.test(lower)) { italicCount = Math.max(0, italicCount - 1); return; }
    if (/^<u(\s|>)/.test(lower)) { underlineCount++; return; }
    if (/^<\/u>/.test(lower)) { underlineCount = Math.max(0, underlineCount - 1); return; }
    if (/^<(s|del|strike)(\s|>)/.test(lower)) { strikeCount++; return; }
    if (/^<\/(s|del|strike)>/.test(lower)) { strikeCount = Math.max(0, strikeCount - 1); return; }
    if (/^<(sup|sub)(\s|>)/.test(lower)) { supSubCount++; return; }
    if (/^<\/(sup|sub)>/.test(lower)) { supSubCount = Math.max(0, supSubCount - 1); return; }

    if (/^<a(\s|>)/.test(lower)) {
      const hrefMatch = part.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const rawHref = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '') : '';
      linkStack.push(isSafeHttpUrl(rawHref));
      return;
    }
    if (/^<\/a>/.test(lower)) {
      linkStack.pop();
      return;
    }

    const clean = decodeHtmlEntities(part.replace(/<[^>]+>/g, ''));
    if (!clean) return;

    const activeHref = linkStack.length > 0 ? linkStack[linkStack.length - 1] : null;
    const isUnderline = underlineCount > 0 || Boolean(activeHref);
    const isStrike = strikeCount > 0;
    const textDecorationLine: TextStyle['textDecorationLine'] =
      isUnderline && isStrike
        ? 'underline line-through'
        : isUnderline
        ? 'underline'
        : isStrike
        ? 'line-through'
        : undefined;

    nodes.push(
      <Text
        key={`${keyPrefix}-${index}`}
        onPress={activeHref ? () => void openExternalLink(activeHref) : undefined}
        style={[
          styles.inlineText,
          baseStyle,
          boldCount > 0 && styles.inlineBold,
          italicCount > 0 && styles.inlineItalic,
          supSubCount > 0 && styles.inlineSupSub,
          activeHref ? styles.inlineLink : undefined,
          textDecorationLine ? { textDecorationLine } : undefined,
        ]}
      >
        {clean}
      </Text>,
    );
  });

  return nodes;
}

/**
 * Finds the end of a balanced tag pair starting at `openStart` (index of `<tag...>`).
 */
function findMatchingCloseTag(html: string, tag: string, contentStart: number): { innerEnd: number; outerEnd: number } | null {
  const tagRegex = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  tagRegex.lastIndex = contentStart;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(html)) !== null) {
    if (m[1] === '/') {
      depth--;
      if (depth === 0) {
        return { innerEnd: m.index, outerEnd: m.index + m[0].length };
      }
    } else if (!m[0].endsWith('/>')) {
      depth++;
    }
  }
  return null;
}

function parseTableRows(tableHtml: string): TableRowData[] {
  const rows: TableRowData[] = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowContent = rowMatch[1];
    const cells: TableCellData[] = [];
    const cellRegex = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const tagName = cellMatch[1].toLowerCase();
      const attrs = cellMatch[2] || '';
      const colspanMatch = attrs.match(/\bcolspan\s*=\s*(?:"(\d+)"|'(\d+)'|(\d+))/i);
      const parsedSpan = colspanMatch ? Number(colspanMatch[1] ?? colspanMatch[2] ?? colspanMatch[3]) : 1;
      cells.push({
        isHeader: tagName === 'th',
        colspan: Number.isFinite(parsedSpan) && parsedSpan > 1 ? parsedSpan : 1,
        content: cellMatch[3].trim(),
      });
    }

    if (cells.length > 0) {
      rows.push({ cells });
    }
  }

  return rows;
}

function parseListItems(listHtml: string, ordered: boolean, depth: number, out: BlockNode[]): void {
  let cursor = 0;
  let counter = 1;

  while (cursor < listHtml.length) {
    const nextLi = /<li\b[^>]*>/i.exec(listHtml.slice(cursor));
    if (!nextLi) break;

    const openIdx = cursor + nextLi.index;
    const contentStart = openIdx + nextLi[0].length;
    const bounds = findMatchingCloseTag(listHtml, 'li', contentStart);
    if (!bounds) break;

    const liInner = listHtml.slice(contentStart, bounds.innerEnd);
    cursor = bounds.outerEnd;

    // Check if this <li> contains a nested <ul> or <ol>
    const nestedMatch = /<(ul|ol)\b[^>]*>/i.exec(liInner);
    if (nestedMatch) {
      const nestedTag = nestedMatch[1].toLowerCase();
      const beforeNested = liInner.slice(0, nestedMatch.index).trim();
      if (beforeNested) {
        out.push({
          type: 'listItem',
          ordered,
          index: counter++,
          depth,
          content: beforeNested,
        });
      }
      const nestedOpenStart = nestedMatch.index + nestedMatch[0].length;
      const nestedBounds = findMatchingCloseTag(liInner, nestedTag, nestedOpenStart);
      if (nestedBounds) {
        parseListItems(liInner.slice(nestedOpenStart, nestedBounds.innerEnd), nestedTag === 'ol', depth + 1, out);
        const afterNested = liInner.slice(nestedBounds.outerEnd).trim();
        if (afterNested) {
          out.push({
            type: 'listItem',
            ordered,
            index: counter++,
            depth,
            content: afterNested,
          });
        }
      }
    } else if (liInner.trim()) {
      out.push({
        type: 'listItem',
        ordered,
        index: counter++,
        depth,
        content: liInner.trim(),
      });
    }
  }
}

function parseHtmlBlocks(html: string): BlockNode[] {
  const blocks: BlockNode[] = [];
  const blockStartRegex = /<(hr|table|blockquote|ul|ol|h[1-4]|p|div)\b[^>]*>/gi;
  let cursor = 0;

  while (cursor < html.length) {
    blockStartRegex.lastIndex = cursor;
    const match = blockStartRegex.exec(html);
    if (!match) break;

    const between = html.slice(cursor, match.index).trim();
    if (between) {
      blocks.push({ type: 'paragraph', content: between });
    }

    const tag = match[1].toLowerCase();
    const contentStart = match.index + match[0].length;

    if (tag === 'hr') {
      blocks.push({ type: 'hr' });
      cursor = contentStart;
      continue;
    }

    const bounds = findMatchingCloseTag(html, tag, contentStart);
    if (!bounds) {
      // Unclosed tag fallback: emit inner slice as paragraph and stop loop safely
      const remainder = html.slice(contentStart).trim();
      if (remainder) blocks.push({ type: 'paragraph', content: remainder });
      cursor = html.length;
      break;
    }

    const inner = html.slice(contentStart, bounds.innerEnd);
    cursor = bounds.outerEnd;

    if (tag === 'table') {
      const rows = parseTableRows(inner);
      if (rows.length > 0) {
        blocks.push({ type: 'table', rows });
      }
    } else if (tag === 'blockquote') {
      if (inner.trim()) {
        blocks.push({ type: 'blockquote', content: inner.trim() });
      }
    } else if (tag === 'ul' || tag === 'ol') {
      parseListItems(inner, tag === 'ol', 0, blocks);
    } else if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      const level = Number(tag.slice(1)) as 1 | 2 | 3 | 4;
      if (inner.trim()) {
        blocks.push({ type: 'heading', level, content: inner.trim() });
      }
    } else if (tag === 'div' && /<(hr|table|blockquote|ul|ol|h[1-4]|p|div)\b/i.test(inner)) {
      blocks.push(...parseHtmlBlocks(inner));
    } else if (inner.trim()) {
      blocks.push({ type: 'paragraph', content: inner.trim() });
    }
  }

  const tail = html.slice(cursor).trim();
  if (tail) {
    blocks.push({ type: 'paragraph', content: tail });
  }

  return blocks;
}

function renderTableBlock(rows: TableRowData[], blockKey: string): React.ReactNode {
  const maxCols = rows.reduce((max, row) => {
    const rowCols = row.cells.reduce((sum, cell) => sum + cell.colspan, 0);
    return Math.max(max, rowCols);
  }, 1);

  const firstRow = rows[0];
  const useScrollableCols = maxCols >= 3;
  const colWidths: number[] = Array.from({ length: maxCols }, (_, colIdx) => {
    const headerText = firstRow?.cells[colIdx]?.content.replace(/<[^>]+>/g, '').trim().toLowerCase() ?? '';
    if (headerText === 'no' || headerText === 'no.' || headerText === '#') {
      return 48;
    }
    return maxCols === 3 ? 124 : 136;
  });

  const tableBody = (
    <View style={styles.tableBox}>
      {rows.map((row, rIdx) => {
        const isLastRow = rIdx === rows.length - 1;
        let colOffset = 0;

        return (
          <View
            key={`${blockKey}-r-${rIdx}`}
            style={[styles.tableRow, isLastRow && styles.tableRowLast]}
          >
            {row.cells.map((cell, cIdx) => {
              const isLastCell = cIdx === row.cells.length - 1;
              let spanWidth = 0;
              for (let s = 0; s < cell.colspan; s++) {
                spanWidth += colWidths[colOffset + s] ?? 130;
              }
              colOffset += cell.colspan;

              const cellStyle: ViewStyle = useScrollableCols
                ? { width: spanWidth }
                : { flex: cell.colspan };

              return (
                <View
                  key={`${blockKey}-c-${rIdx}-${cIdx}`}
                  style={[
                    styles.tableCell,
                    cell.isHeader ? styles.tableHeaderCell : styles.tableDataCell,
                    isLastCell && styles.tableCellLast,
                    cellStyle,
                  ]}
                >
                  <Text
                    style={[
                      styles.tableCellText,
                      cell.isHeader && styles.tableHeaderText,
                    ]}
                  >
                    {renderInline(
                      cell.content,
                      `${blockKey}-${rIdx}-${cIdx}`,
                      cell.isHeader ? styles.tableHeaderText : styles.tableCellText,
                    )}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );

  if (useScrollableCols) {
    return (
      <ScrollView
        key={blockKey}
        horizontal
        bounces={false}
        showsHorizontalScrollIndicator
        nestedScrollEnabled
        style={styles.tableScrollWrap}
      >
        {tableBody}
      </ScrollView>
    );
  }

  return (
    <View key={blockKey} style={styles.tableStaticWrap}>
      {tableBody}
    </View>
  );
}

export const SimpleHtmlView: React.FC<SimpleHtmlViewProps> = ({ html, style }) => {
  if (!html || !html.trim()) return null;

  const safe = html
    .replace(/<(script|style|iframe|object|embed|template|noscript|svg|math)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\r\n/g, '\n');

  const blocks = parseHtmlBlocks(safe);
  if (blocks.length === 0) {
    blocks.push({ type: 'paragraph', content: safe.trim() });
  }

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, idx) => {
        if (block.type === 'hr') {
          return <View key={idx} style={styles.hrLine} />;
        }

        if (block.type === 'table') {
          return renderTableBlock(block.rows, `tbl-${idx}`);
        }

        if (block.type === 'blockquote') {
          const innerBlocks = parseHtmlBlocks(block.content);
          return (
            <View key={idx} style={styles.blockquoteBox}>
              {innerBlocks.length > 0 ? (
                innerBlocks.map((inner, bIdx) => {
                  const rawInner = 'content' in inner ? inner.content : '';
                  const nodes = renderInline(rawInner, `bq-${idx}-${bIdx}`, styles.blockquoteText);
                  if (nodes.length === 0) return null;
                  return (
                    <Text key={bIdx} style={styles.blockquoteText}>
                      {nodes}
                    </Text>
                  );
                })
              ) : (
                <Text style={styles.blockquoteText}>
                  {renderInline(block.content, `bq-${idx}`, styles.blockquoteText)}
                </Text>
              )}
            </View>
          );
        }

        if (block.type === 'heading') {
          const headingStyle =
            block.level === 1
              ? styles.h1
              : block.level === 2
              ? styles.h2
              : block.level === 3
              ? styles.h3
              : styles.h4;
          const cleanHeading = decodeHtmlEntities(block.content.replace(/<[^>]+>/g, '').trim());
          if (!cleanHeading) return null;
          return (
            <Text key={idx} style={headingStyle}>
              {cleanHeading}
            </Text>
          );
        }

        if (block.type === 'listItem') {
          const marker = block.ordered ? `${block.index}.` : '•';
          const nodes = renderInline(block.content, `li-${idx}`);
          if (nodes.length === 0) return null;
          return (
            <View key={idx} style={[styles.listRow, { paddingLeft: 4 + block.depth * 14 }]}>
              <Text style={styles.listMarker}>{marker}</Text>
              <Text style={styles.paragraph}>{nodes}</Text>
            </View>
          );
        }

        const nodes = renderInline(block.content, `p-${idx}`);
        if (nodes.length === 0) return null;
        return (
          <Text key={idx} style={styles.paragraph}>
            {nodes}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  h1: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    color: colors.onSurface,
    marginTop: 2,
  },
  h2: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
    marginTop: 2,
  },
  h3: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  h4: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12.5,
    color: colors.secondary,
  },
  paragraph: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textSecondary,
    flex: 1,
  },
  inlineText: {
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
  },
  inlineBold: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  inlineItalic: {
    fontStyle: 'italic',
  },
  inlineSupSub: {
    fontSize: 10,
  },
  inlineLink: {
    fontFamily: fontFamilies.sansMedium,
    color: colors.infoText,
    textDecorationLine: 'underline',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
  },
  listMarker: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.primary,
    minWidth: 16,
  },
  blockquoteBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.sm,
    gap: spacing.xs,
  },
  blockquoteText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12.5,
    lineHeight: 18,
    fontStyle: 'italic',
    color: colors.onSurfaceVariant,
  },
  hrLine: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  tableStaticWrap: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  tableScrollWrap: {
    width: '100%',
    marginVertical: spacing.xs,
  },
  tableBox: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
    justifyContent: 'flex-start',
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableHeaderCell: {
    backgroundColor: colors.surfaceSoft,
  },
  tableDataCell: {
    backgroundColor: colors.surfaceCard,
  },
  tableCellText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  tableHeaderText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
  },
});
