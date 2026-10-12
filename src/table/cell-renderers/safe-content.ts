/** `value` as text for HTML: `&`, `<`, `>`, `"` and `'` written as character references. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The URL schemes a link in a cell may take. A URL without a scheme is relative and is taken. */
export const allowedUrlSchemes: readonly string[] = ['http', 'https', 'mailto', 'tel'];

/**
 * `value` as a URL a link may point to, or `null` where its scheme is not one of `allowedUrlSchemes`. The scheme is
 * read with whitespace and control characters removed, as a browser reads it, so `java\tscript:` is refused.
 */
export function safeUrl(value: unknown): string | null {
  const url = String(value ?? '').trim();
  // eslint-disable-next-line no-control-regex
  const scheme = /^([^/?#]*?):/.exec(url.replace(/[\u0000- \u007f]/g, ''))?.[1];
  if (scheme === undefined) return url;
  return allowedUrlSchemes.includes(scheme.toLowerCase()) ? url : null;
}
