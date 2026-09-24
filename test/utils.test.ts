import { describe, expect, it } from 'vitest';
import { BRAND_SYMBOL, createNamedArg } from '../src/named_args';
import { pipeline } from '../src/utils';

describe('pipeline', () => {
  it('applies chained maps and filters when called', () => {
    const amount = createNamedArg<number, 'amount'>('amount');
    const converted = pipeline<string, number>(amount)
      .map(value => Number(value))
      .filter(value => value >= 0, 0)
      .map(value => value * 2);

    expect(converted.apply('5')[BRAND_SYMBOL].value).toBe(10);
    expect(converted(' -3 ')[BRAND_SYMBOL].value).toBe(0);
  });
});
