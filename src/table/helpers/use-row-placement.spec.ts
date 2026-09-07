import { describe, expect, it } from 'vitest';

import { headerRowBaseVars, rowBaseVars } from './use-row-placement';

describe('rowBaseVars', () => {
  it('is zero for the first record regardless of rowsPerRecord', () => {
    expect(rowBaseVars(0, 1)).toEqual({ '--row-base': '0', '--rows-per-record': '1' });
    expect(rowBaseVars(0, 3)).toEqual({ '--row-base': '0', '--rows-per-record': '3' });
  });

  it('scales by rowsPerRecord for later records', () => {
    expect(rowBaseVars(5, 1)).toEqual({ '--row-base': '5', '--rows-per-record': '1' });
    expect(rowBaseVars(5, 3)).toEqual({ '--row-base': '15', '--rows-per-record': '3' });
  });
});

describe('headerRowBaseVars', () => {
  it('is the same as rowBaseVars for record index 0', () => {
    expect(headerRowBaseVars(3)).toEqual(rowBaseVars(0, 3));
  });
});
