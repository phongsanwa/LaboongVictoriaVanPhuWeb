import { Pipe, PipeTransform } from '@angular/core';
import {AppUrlService} from '../../../../core/services/app-url.service';

@Pipe({
  name: 'shortNumber',
  standalone: true
})
export class ShortNumberPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';

    const abs = Math.abs(num);

    if (abs >= 1_000_000_000) {
      return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (abs >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (abs >= 1_000) {
      // Làm tròn 1 chữ số thập phân, nhưng nếu là số nguyên thì bỏ .0
      const formatted = (num / 1_000).toFixed(1);
      return formatted.replace(/\.0$/, '') + 'k';
    }

    return num.toString();
  }
}

@Pipe({
  name: 'assetUrl',
  standalone: true,
  pure: true,
})
export class AssetUrlPipe implements PipeTransform {
  constructor(private appUrl: AppUrlService) {}
  transform(relPath: string | null | undefined): string {
    if (!relPath) return '';
    return this.appUrl.buildAssetUrl(relPath);
  }
}
