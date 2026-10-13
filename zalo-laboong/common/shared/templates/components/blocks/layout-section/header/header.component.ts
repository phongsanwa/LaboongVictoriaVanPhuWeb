import {
  Component,
  ChangeDetectionStrategy, inject,
} from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  IZmaHeaderConfig,
} from 'common/shared/templates';
import { DemoUiConfigService } from 'common/core/services/demo-ui-config.service';
import { AppConfigStateService } from 'common/core/services/app-config-state.service';
import {uriFeConst} from '../../../../../constants';
import {IHeaderConfig, IHeaderGreetingConfig} from '../../../../../models/global';
import {IResUserInfo} from '../../../../../../core/models/zmp.model';
import {HeaderFooterFacadeService} from '../../../../../services/global';
import {openChat} from 'zmp-sdk/apis';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class HeaderComponent {
  headerConfig$: Observable<IZmaHeaderConfig | null>;
  private readonly facade = inject(HeaderFooterFacadeService);
  private readonly configState = inject(AppConfigStateService);
  user?: IResUserInfo | null;

  /** Brand name fallback cho header, ưu tiên từ BE config */
  get headerBrand(): string {
    return this.configState.headerTitle || this.configState.appTitle || 'Nhanh Shop';
  }

  constructor(
    private demoUiConfig: DemoUiConfigService,
  ) {
    this.headerConfig$ = this.demoUiConfig.activeTemplate$.pipe(
      map(tpl => tpl?.header ?? null),
    );

    this.facade.user$.subscribe(u => { this.user = u; });
  }

  getHeaderType(header: IZmaHeaderConfig | null): string {
    if (!header || !header.type) return 'style1';
    return header.type;
  }

  isGreeting(c: IHeaderConfig): c is IHeaderGreetingConfig { return c.variant === 'greeting'; }

  openSupportChat() {
    openChat({type: 'oa', id: '762755468038541624', message: 'Xin chào'});
  }

  protected readonly uriFeConst = uriFeConst;
}
