import { describe, expect, it } from 'vitest';

import { headerRowBaseVars, rowBaseVars } from './use-row-placement';

describe('rowBaseVars', () => {
  it('is zero for the first window position regardless of rowsPerRecord', () => {
    expect(rowBaseVars(0, 1)).toEqual({ '--row-base': '0', '--rows-per-record': '1' });
    expect(rowBaseVars(0, 3)).toEqual({ '--row-base': '0', '--rows-per-record': '3' });
  });

  it('scales by rowsPerRecord for later window positions', () => {
    expect(rowBaseVars(5, 1)).toEqual({ '--row-base': '5', '--rows-per-record': '1' });
    expect(rowBaseVars(5, 3)).toEqual({ '--row-base': '15', '--rows-per-record': '3' });
  });

  it('defaults lineOffset to 0', () => {
    expect(rowBaseVars(5, 3)).toEqual(rowBaseVars(5, 3, 0));
  });

  it('shifts the result by lineOffset, for the reserved top-spacer line', () => {
    expect(rowBaseVars(0, 3, 1)).toEqual({ '--row-base': '1', '--rows-per-record': '3' });
    expect(rowBaseVars(5, 3, 1)).toEqual({ '--row-base': '16', '--rows-per-record': '3' });
  });

  it('stays small for a window position far into a huge dataset', () => {
    // A record a million places into the dataset, but only the 3rd one in the currently-mounted
    // window, places at row-base 6 (window position 2 * rowsPerRecord 3) — not 3,000,000.
    expect(rowBaseVars(2, 3, 1)).toEqual({ '--row-base': '7', '--rows-per-record': '3' });
  });
});

describe('headerRowBaseVars', () => {
  it('is the same as rowBaseVars for record index 0', () => {
    expect(headerRowBaseVars(3)).toEqual(rowBaseVars(0, 3));
  });
});
