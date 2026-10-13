import {Subject} from 'rxjs';
import {inject, Injectable} from '@angular/core';
import {AppService, NavService, NotifyService, SpinnerService, UserService} from '@core/services';
import {IFooterConfig, IHeaderConfig} from '@shared/models/global';
import {HeaderFooterFacadeService} from '@shared/services/global';

/**
 * Description handle
 * - Config header and footer
 * - Set data initialization.
 * - Func handle events.
 * */
@Injectable({
  providedIn: "any"
})
export class AppCommonComponent {
  destroyed = new Subject()

  // Handle other -----------------------------------------------------------------------------------------------------
  notifyService: NotifyService = inject(NotifyService);
  navService: NavService = inject(NavService);
  userService: UserService = inject(UserService);
  appService: AppService = inject(AppService);
  spinner: SpinnerService = inject(SpinnerService);
  headerFooterFacade = inject(HeaderFooterFacadeService);

  constructor(

  ) {
  }

  getDestroySubs() {
    this.destroyed.next(null);
    this.destroyed.complete();
  }

  protected setHeader(cfg?: IHeaderConfig): void {
    this.headerFooterFacade.setHeader(cfg);
  }
  protected setFooter(cfg?: IFooterConfig): void {
    this.headerFooterFacade.setFooter(cfg);
  }

  protected header$ = this.headerFooterFacade.header$;
  protected footer$ = this.headerFooterFacade.footer$;
}
