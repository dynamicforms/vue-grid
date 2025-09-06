import { CellOptionsInternal, gridIdOption, columnIdOption, columnNameOption } from './internal-exports';
import { color, checkbox, link, email, ip4, ip6, ip, date, DateTimeOptions } from './simple-renderers';

describe('simple-renderers.ts', () => {
  describe('color renderer', () => {
    it('should render color div with background style', () => {
      const result = color('#ff0000');
      expect(result).toBe('<div class="df-cell-color" style="background-color: #ff0000;"/>');
    });

    it('should handle string color values', () => {
      const result = color('blue');
      expect(result).toBe('<div class="df-cell-color" style="background-color: blue;"/>');
    });

    it('should handle any value type', () => {
      const result = color(123);
      // noinspection CssInvalidPropertyValue
      expect(result).toBe('<div class="df-cell-color" style="background-color: 123;"/>');
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

  describe('link renderer', () => {
    it('should render basic URL as link', () => {
      const result = link('https://example.com');
      expect(result).toBe('<a href="https://example.com">https://example.com</a>');
    });

    it('should handle any value type', () => {
      const result = link(123);
      expect(result).toBe('<a href="123">123</a>');
    });

    it('should handle empty values', () => {
      const result = link('');
      expect(result).toBe('<a href=""></a>');
    });
  });

  describe('email renderer', () => {
    it('should render simple email address', () => {
      const result = email('test@example.com');
      expect(result).toBe('<a href="mailto:test@example.com">test</a>');
    });

    it('should handle email with name format', () => {
      const result = email('John Doe <john@example.com>');
      expect(result).toBe('<a href="mailto:John Doe <john@example.com>">John Doe</a>');
    });

    it('should handle email with spaces in name', () => {
      const result = email('  John Smith  <john@example.com>');
      expect(result).toBe('<a href="mailto:  John Smith  <john@example.com>">John Smith</a>');
    });

    it('should handle plain email without name', () => {
      const result = email('simple@test.com');
      expect(result).toBe('<a href="mailto:simple@test.com">simple</a>');
    });

    it('should handle invalid email format', () => {
      const result = email('not-an-email');
      expect(result).toBe('<a href="mailto:not-an-email">not-an-email</a>');
    });

    it('should handle numeric input', () => {
      const result = email(123);
      expect(result).toBe('<a href="mailto:123">123</a>');
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
