import {Injectable, Inject, Optional} from '@angular/core';
import {APP_BASE_HREF} from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AppUrlService {
  private absoluteBase = '';
  private basePath = '';

  constructor(
    @Optional() @Inject(APP_BASE_HREF) baseHref: string | null,
    ) {
    this.basePath = (baseHref || '').replace(/^\/+|\/+$/g, '');
    this.recomputeBaseFrom(location.href);
  }
  recomputeBaseFrom(rawUrl: string) {
    const domain = 'https://h5.zadn.vn/';
    const ver =
      new URL(rawUrl, location.origin).searchParams.get('version') ||
      (window as any).APP_VERSION ||
      '';

    const fullBase = `${domain}${this.basePath}/${ver ? ver + '/' : ''}`;

    this.absoluteBase = new URL(fullBase, domain).href;
  }

  buildAssetUrl(relPath: string) {
    if(this.basePath === '') {
      return relPath;
    }
    return new URL(relPath.replace(/^\/+/, ''), this.absoluteBase).href;
  }
}
