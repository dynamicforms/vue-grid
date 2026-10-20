import { shallowRef } from 'vue';

/** `value` as text for HTML: `&`, `<`, `>`, `"` and `'` written as character references. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The URL schemes a link in a cell may take where neither `setAllowedUrlSchemes` nor the column names others. */
export const defaultUrlSchemes: readonly string[] = ['http', 'https', 'mailto', 'tel'];

// a ref, so that the grids render their links again when the schemes change
const allowedUrlSchemes = shallowRef<readonly string[]>(defaultUrlSchemes);

/**
 * The URL schemes a link in a cell may take, in every grid, for a column whose `rendererOptions` name no `urlSchemes`.
 * The grids render their links again. A URL without a scheme is relative and is always taken.
 */
export function setAllowedUrlSchemes(schemes: readonly string[]): void {
  allowedUrlSchemes.value = schemes.map((scheme) => scheme.toLowerCase());
}

/** The URL schemes a link in a cell may take where the column names none: `defaultUrlSchemes` until they are set. */
export function getAllowedUrlSchemes(): readonly string[] {
  return allowedUrlSchemes.value;
}

/**
 * `value` as a URL a link may point to, or `null` where its scheme is not one of `schemes`. The scheme is read with
 * whitespace and control characters removed, as a browser reads it, so `java\tscript:` is refused. A URL without a
 * scheme is relative and is taken.
 */
export function safeUrl(value: unknown, schemes: readonly string[] = getAllowedUrlSchemes()): string | null {
  const url = String(value ?? '').trim();
  // eslint-disable-next-line no-control-regex
  const scheme = /^([^/?#]*?):/.exec(url.replace(/[\u0000- \u007f]/g, ''))?.[1];
  if (scheme === undefined) return url;
  return schemes.some((allowed) => allowed.toLowerCase() === scheme.toLowerCase()) ? url : null;
}
