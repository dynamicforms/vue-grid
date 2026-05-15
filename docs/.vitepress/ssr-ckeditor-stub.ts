// CKEditor uses browser APIs (document.createElement) at module initialization time,
// which causes VitePress SSR pre-rendering to fail. This plugin replaces all CKEditor
// imports with no-op stubs during SSR so pages can be pre-rendered safely.
// In the browser, the real modules are loaded normally.

const stubCode = `
class NoopClass {}
const noop = () => {};
export default NoopClass;
export const CkeditorPlugin = { install: noop };
export const Ckeditor = NoopClass;
export const ClassicEditor = NoopClass;
export const AccessibilityHelp = NoopClass;
export const Alignment = NoopClass;
export const Autoformat = NoopClass;
export const AutoImage = NoopClass;
export const AutoLink = NoopClass;
export const Autosave = NoopClass;
export const BalloonToolbar = NoopClass;
export const Base64UploadAdapter = NoopClass;
export const BlockQuote = NoopClass;
export const Bold = NoopClass;
export const CloudServices = NoopClass;
export const Essentials = NoopClass;
export const GeneralHtmlSupport = NoopClass;
export const Heading = NoopClass;
export const HorizontalLine = NoopClass;
export const ImageBlock = NoopClass;
export const ImageCaption = NoopClass;
export const ImageInline = NoopClass;
export const ImageInsertViaUrl = NoopClass;
export const ImageResize = NoopClass;
export const ImageStyle = NoopClass;
export const ImageToolbar = NoopClass;
export const ImageUpload = NoopClass;
export const Indent = NoopClass;
export const IndentBlock = NoopClass;
export const Italic = NoopClass;
export const Link = NoopClass;
export const List = NoopClass;
export const MediaEmbed = NoopClass;
export const Paragraph = NoopClass;
export const PasteFromMarkdownExperimental = NoopClass;
export const PasteFromOffice = NoopClass;
export const SelectAll = NoopClass;
export const Style = NoopClass;
export const Table = NoopClass;
export const TableCellProperties = NoopClass;
export const TableColumnResize = NoopClass;
export const TableProperties = NoopClass;
export const TableToolbar = NoopClass;
export const TextTransformation = NoopClass;
export const Undo = NoopClass;
`;

const ssrCkeditorStub = {
  name: 'ssr-ckeditor-stub',
  enforce: 'pre' as const,
  resolveId(id, _importer, options) {
    if (options?.ssr && (id === 'ckeditor5' || id.startsWith('@ckeditor/'))) {
      return '\0ck-ssr-stub';
    }
  },
  load(id) {
    if (id === '\0ck-ssr-stub') return stubCode;
  },
};

export default ssrCkeditorStub;