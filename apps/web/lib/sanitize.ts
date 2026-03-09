const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
  'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span',
  'hr', 'sub', 'sup', 'mark',
]);

const ALLOWED_ATTR = new Set([
  'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
  'class', 'style', 'id', 'colspan', 'rowspan',
]);

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  return dirty
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tag, attrs) => {
      const lowerTag = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(lowerTag)) return '';

      const cleanAttrs = (attrs as string).replace(
        /\s+([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/gi,
        (_m: string, name: string, v1: string, v2: string, v3: string) => {
          if (!ALLOWED_ATTR.has(name.toLowerCase())) return '';
          const val = v1 ?? v2 ?? v3 ?? '';
          if (name.toLowerCase() === 'href' && /^\s*javascript:/i.test(val)) return '';
          return ` ${name}="${val.replace(/"/g, '&quot;')}"`;
        }
      );

      return `<${match.startsWith('</') ? '/' : ''}${lowerTag}${match.startsWith('</') ? '' : cleanAttrs}>`;
    });
}
