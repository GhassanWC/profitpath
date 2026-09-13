import { Pipe, PipeTransform } from '@angular/core';
import { formatMoney, formatPct, signed } from '../core/engine';

@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'USD', decimals?: number): string {
    if (value === null || value === undefined) return '—';
    return formatMoney(value, currency, { decimals });
  }
}

@Pipe({ name: 'pct', standalone: true })
export class PctPipe implements PipeTransform {
  transform(fraction: number | null | undefined, decimals = 1): string {
    if (fraction === null || fraction === undefined) return '—';
    return formatPct(fraction, decimals);
  }
}

@Pipe({ name: 'signed', standalone: true })
export class SignedPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'USD'): string {
    if (value === null || value === undefined) return '—';
    return signed(value, currency);
  }
}
