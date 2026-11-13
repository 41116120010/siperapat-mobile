import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { spacing } from '../../../core/theme/tokens';

interface SimpleHtmlViewProps {
  html?: string | null;
  style?: ViewStyle;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&bull;/gi, '•');
}

function renderInline(fragment: string, keyPrefix: string): React.ReactNode[] {
  const normalized = fragment.replace(/<br\s*\/?>/gi, '\n');
  const tokens = normalized.split(/(<\/?(?:strong|b|em|i)\b[^>]*>)/gi);
  const nodes: React.ReactNode[] = [];
  let bold = false;
  let italic = false;

  tokens.forEach((part, index) => {
    const lower = part.toLowerCase();
    if (/^<(strong|b)\b/.test(lower)) { bold = true; return; }
    if (/^<\/(strong|b)>/.test(lower)) { bold = false; return; }
    if (/^<(em|i)\b/.test(lower)) { italic = true; return; }
    if (/^<\/(em|i)>/.test(lower)) { italic = false; return; }

    const clean = decodeEntities(part.replace(/<[^>]+>/g, ''));
    if (!clean) return;
    nodes.push(
      <Text
        key={`${keyPrefix}-${index}`}
        style={[
          styles.inlineText,
          bold && styles.inlineBold,
          italic && styles.inlineItalic,
        ]}
      >
        {clean}
      </Text>,
    );
  });
  return nodes;
}

export const SimpleHtmlView: React.FC<SimpleHtmlViewProps> = ({ html, style }) => {
  if (!html || !html.trim()) return null;

  const safe = html
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\r\n/g, '\n');

  const blockRegex = /<(h[1-3]|p|ul|ol|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const blocks: Array<{ tag: string; content: string }> = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(safe)) !== null) {
    const between = safe.slice(cursor, match.index).trim();
    if (between) blocks.push({ tag: 'p', content: between });
    const tag = match[1].toLowerCase();
    if (tag === 'ul' || tag === 'ol') {
      const liRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      let idx = 1;
      while ((liMatch = liRegex.exec(match[2])) !== null) {
        blocks.push({ tag: tag === 'ol' ? `ol:${idx++}` : 'ul', content: liMatch[1] });
      }
    } else {
      blocks.push({ tag, content: match[2] });
    }
    cursor = match.index + match[0].length;
  }

  const tail = safe.slice(cursor).trim();
  if (tail) blocks.push({ tag: 'p', content: tail });
  if (blocks.length === 0) blocks.push({ tag: 'p', content: safe });

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, idx) => {
        if (block.tag.startsWith('h')) {
          const headingStyle =
            block.tag === 'h1' ? styles.h1 : block.tag === 'h2' ? styles.h2 : styles.h3;
          return (
            <Text key={idx} style={headingStyle}>
              {decodeEntities(block.content.replace(/<[^>]+>/g, '').trim())}
            </Text>
          );
        }
        if (block.tag === 'ul' || block.tag.startsWith('ol:')) {
          const marker = block.tag === 'ul' ? '•' : `${block.tag.split(':')[1]}.`;
          return (
            <View key={idx} style={styles.listRow}>
              <Text style={styles.listMarker}>{marker}</Text>
              <Text style={styles.paragraph}>{renderInline(block.content, `li-${idx}`)}</Text>
            </View>
          );
        }
        const nodes = renderInline(block.content.trim(), `p-${idx}`);
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
  container: { gap: spacing.xs + 2 },
  h1: { ...typography.headlineSm, fontFamily: fontFamilies.sansBold, fontSize: 15, color: colors.onSurface, marginTop: 2 },
  h2: { ...typography.headlineSm, fontFamily: fontFamilies.sansBold, fontSize: 14, color: colors.onSurface, marginTop: 2 },
  h3: { ...typography.labelLg, fontFamily: fontFamilies.sansBold, fontSize: 13, color: colors.onSurface },
  paragraph: { ...typography.bodySm, fontFamily: fontFamilies.sansRegular, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary, flex: 1 },
  inlineText: { fontFamily: fontFamilies.sansRegular, color: colors.textSecondary },
  inlineBold: { fontFamily: fontFamilies.sansBold, color: colors.onSurface },
  inlineItalic: { fontStyle: 'italic' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs + 2, paddingLeft: 4 },
  listMarker: { ...typography.bodySm, fontFamily: fontFamilies.sansBold, fontSize: 12.5, lineHeight: 19, color: colors.primary, minWidth: 14 },
});
