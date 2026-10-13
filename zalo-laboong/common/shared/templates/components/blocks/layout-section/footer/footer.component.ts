import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {DemoUiConfigService} from 'common/core/services/demo-ui-config.service';
import {IZmaFooterConfig} from 'common/shared/templates';
import {uriFeConst} from '../../../../../constants';
import {DEFAULT_FOOTER, IFooterConfig, IFooterTabsConfig} from '../../../../../models/global';

export interface IFooterItem {
  path?: string;
  label: string;
  iconClass?: string;
  iconTypeImg?: string;
  badge?: 'dot' | 'number';
  queryParams?: Record<string, any>;
  exact?: boolean;
}

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class FooterComponent {
  @Input() items: IFooterItem[] = [
    { path: '/', iconClass: 'ph-light ph-house', label: 'Trang chủ' },
    {
      path: uriFeConst.product.category,
      iconClass: 'ph-light ph-squares-four',
      label: 'Danh mục',
      iconTypeImg: 'assets/img/menu_icon.png',
    },
    { path: uriFeConst.user.voucher, iconClass: 'ph-light ph-ticket', label: 'Ưu đãi' },
    { path: '', iconClass: 'ph-light ph-shopping-cart', label: 'Giỏ hàng', badge: 'dot' },
    { path: uriFeConst.user.profile, iconClass: 'ph-light ph-user', label: 'Thành viên' },
  ];


  footerConfig$: Observable<IZmaFooterConfig | null>;

  constructor(private demoUiConfig: DemoUiConfigService) {
    this.footerConfig$ = this.demoUiConfig.activeTemplate$.pipe(
      map((tpl) => tpl?.footer ?? null),
    );
  }

  /** Lấy items: nếu template có footer.items thì ưu tiên, nếu không dùng @Input() items */
  getItemsToRender(footer: IZmaFooterConfig | null): IFooterItem[] {
    if (footer && footer.items && footer.items.length) {
      return footer.items;
    }
    return this.items || [];
  }

  isTabs(footer: IZmaFooterConfig | null): boolean {
    return !!footer
  }

  getFooterColCount(footer: IZmaFooterConfig | null): number {
    const items = this.getItemsToRender(footer);
    return items.length || 1;
  }


  getFooterType(footer: IZmaFooterConfig | null): string {
    if (!footer || !footer.type) return 'nav-basic';
    return footer.type;
  }

  protected readonly cfg = DEFAULT_FOOTER;
  protected readonly uriFeConst = uriFeConst;
}
