import { CellOptionsInternal, gridIdOption, columnIdOption, columnNameOption } from './internal-exports';
import { color, checkbox, link, email, ip4, ip6, ip, date, DateTimeOptions } from './simple-renderers';

describe('simple-renderers.ts', () => {
  describe('color renderer', () => {
    const swatch = (backgroundColor: string) => ({
      componentName: 'div',
      componentProps: { class: 'df-cell-color', style: { backgroundColor } },
    });

    it('should render color div with background style', () => {
      expect(color('#ff0000')).toEqual(swatch('#ff0000'));
    });

    it('should handle string color values', () => {
      expect(color('blue')).toEqual(swatch('blue'));
    });

    it('should handle any value type', () => {
      expect(color(123)).toEqual(swatch('123'));
    });
  });

  describe('checkbox renderer', () => {
    it('should render null as gray empty checkbox', () => {
      const result = checkbox(null);
      expect(result).toBe('<span style="color: gray;">☐</span>');
    });

    it('should render true as green checkmark', () => {
      const result = checkbox(true);
      expect(result).toBe('<span style="color: green;">✓</span>');
    });

    it('should render false as red X', () => {
      const result = checkbox(false);
      expect(result).toBe('<span style="color: red;">✗</span>');
    });

    it('should render unknown values as question marks', () => {
      expect(checkbox('unknown')).toBe('??');
      expect(checkbox(123)).toBe('??');
      expect(checkbox(undefined)).toBe('??');
    });
  });

  const a = (href: string, textContent: string) => ({ componentName: 'a', componentProps: { href, textContent } });

  describe('link renderer', () => {
    it('should render basic URL as link', () => {
      expect(link('https://example.com')).toEqual(a('https://example.com', 'https://example.com'));
    });

    it('should handle any value type', () => {
      expect(link(123)).toEqual(a('123', '123'));
    });

    it('should handle empty values', () => {
      expect(link('')).toEqual(a('', ''));
    });

    it.each(['javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>'])(
      'renders %j as text, without a link',
      (url) => {
        expect(link(url)).toBe(url);
      },
    );
  });

  describe('email renderer', () => {
    it('should render simple email address', () => {
      expect(email('test@example.com')).toEqual(a('mailto:test@example.com', 'test'));
    });

    it('should handle email with name format', () => {
      expect(email('John Doe <john@example.com>')).toEqual(a('mailto:John Doe <john@example.com>', 'John Doe'));
    });

    it('should handle email with spaces in name', () => {
      expect(email('  John Smith  <john@example.com>')).toEqual(
        a('mailto:  John Smith  <john@example.com>', 'John Smith'),
      );
    });

    it('should handle plain email without name', () => {
      expect(email('simple@test.com')).toEqual(a('mailto:simple@test.com', 'simple'));
    });

    it('should handle invalid email format', () => {
      expect(email('not-an-email')).toEqual(a('mailto:not-an-email', 'not-an-email'));
    });

    it('should handle numeric input', () => {
      expect(email(123)).toEqual(a('mailto:123', '123'));
    });
  });

  describe('markup in a value', () => {
    it.each([
      ['ip4', ip4],
      ['ip6', ip6],
      ['ip', ip],
    ])('%s escapes it', (_, render) => {
      expect(render('<img src=x onerror=alert(1)>')).not.toContain('<img');
    });
  });

  describe('ip4 renderer', () => {
    it('should render valid IPv4 with padding and opacity', () => {
      const result = ip4('192.168.1.1');
      expect(result).toContain('<code>');
      expect(result).toContain('<span>192</span>');
      expect(result).toContain('<span>168</span>');
      expect(result).toContain('<span style="opacity: .5">00</span>');
      expect(result).toContain('span>1</span>');
    });

    it('should handle IP with all segments needing padding', () => {
      const result = ip4('1.2.3.4');
      expect(result).toContain('<span><span style="opacity: .5">00</span>1</span>');
      expect(result).toContain('<span><span style="opacity: .5">00</span>2</span>');
      expect(result).toContain('<span><span style="opacity: .5">00</span>3</span>');
      expect(result).toContain('<span><span style="opacity: .5">00</span>4</span>');
    });

    it('should handle IP with no padding needed', () => {
      const result = ip4('255.255.255.255');
      expect(result).toContain('<span>255</span>');
      expect(result).not.toContain('opacity: .5');
    });

    it('should handle invalid IP format', () => {
      const result = ip4('invalid.ip');
      expect(result).toBe('<code>invalid.ip</code>');
    });

    it('should handle IP with wrong number of segments', () => {
      const result = ip4('192.168.1');
      expect(result).toBe('<code>192.168.1</code>');
    });

    it('should handle numeric input', () => {
      const result = ip4(123);
      expect(result).toBe('<code>123</code>');
    });
  });

  describe('ip6 renderer', () => {
    it('should render valid IPv6 with padding', () => {
      const result = ip6('2001:db8::1');
      expect(result).toContain('<code>');
      expect(result).toContain('<span>2001</span>');
      expect(result).toContain('<span style="opacity: .5">0</span>db8:');
    });

    it('should handle IPv6 with embedded IPv4', () => {
      const result = ip6('::ffff:192.168.1.1');
      expect(result).toContain('<code>');
      expect(result).toMatch(/192.*168.*1.*1/);
      expect(result).toContain('ffff');
    });

    it('should handle short IPv6', () => {
      const result = ip6('::1');
      expect(result).toContain('<code>');
      expect(result).toContain('<span style="opacity: .5">000</span>1');
    });

    it('should handle full IPv6', () => {
      const result = ip6('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      expect(result).toContain('<code>');
      expect(result).toContain('<span>2001</span>');
      expect(result).toContain('<span style="opacity: .5">0</span>db8');
    });

    it('should handle all zeros segment', () => {
      const result = ip6('2001:0000:85a3::7334');
      expect(result).toContain('<span style="opacity: .5">0000</span>');
    });
  });

  describe('ip renderer', () => {
    it('should detect and render IPv6', () => {
      const result = ip('2001:db8::1');
      expect(result).toContain('<code>');
      expect(result).toContain('2001');
      expect(result).toContain('db8');
    });

    it('should detect and render IPv4', () => {
      const result = ip('192.168.1.1');
      expect(result).toContain('<code>');
      expect(result).toContain('<span>192</span>');
      expect(result).toContain('<span>168</span>');
    });

    it('should default to IPv4 for ambiguous input', () => {
      const result = ip('192.168.1');
      expect(result).toBe('<code>192.168.1</code>');
    });

    it('should handle invalid IP format', () => {
      const result = ip('not-an-ip');
      expect(result).toBe('<code>not-an-ip</code>');
    });
  });

  describe('date renderer', () => {
    const mockDate = new Date('2023-12-25T10:30:00Z');
    const mockISOString = '2023-12-25T10:30:00Z';
    const mockOptions = {
      redrawColumn: () => {},
      [gridIdOption]: Symbol('test-grid'),
      [columnNameOption]: 'test-column',
      [columnIdOption]: Symbol('test-column-id'),
    } as CellOptionsInternal<DateTimeOptions>;

    it('should format Date object with default format', () => {
      const result = date(mockDate, 'yyyy-MM-dd', mockOptions);
      expect(result).toBe('2023-12-25');
    });

    it('should format Date object with options format', () => {
      const result = date(mockDate, 'yyyy-MM-dd', { ...mockOptions, format: 'dd/MM/yyyy' });
      expect(result).toBe('25/12/2023');
    });

    it('should format ISO string with options format', () => {
      const result = date(mockISOString, 'yyyy-MM-dd', { ...mockOptions, format: 'dd/MM/yyyy' });
      expect(result).toBe('25/12/2023');
    });

    it('should use default format for ISO string without options', () => {
      const result = date(mockISOString, 'yyyy-MM-dd', mockOptions);
      expect(result).toBe('2023-12-25');
    });

    it('should handle different date formats', () => {
      const result = date(mockDate, 'dd.MM.yyyy HH:mm', mockOptions);
      expect(result).toMatch(/25\.12\.2023 \d{2}:\d{2}/);
    });

    it('should handle invalid date strings gracefully', () => {
      expect(() => date('invalid-date', 'yyyy-MM-dd', mockOptions)).toThrow();
    });

    it('should handle empty options object', () => {
      const result = date(mockDate, 'yyyy-MM-dd', mockOptions);
      expect(result).toBe('2023-12-25');
    });
  });
});
