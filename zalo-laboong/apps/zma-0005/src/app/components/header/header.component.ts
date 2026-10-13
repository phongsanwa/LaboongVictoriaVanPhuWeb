import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {IHeaderConfig, IHeaderGreetingConfig, IHeaderTitleConfig} from '@shared/models/global';
import { IResUserInfo } from '@core/models/zmp.model';
import { uriFeConst } from '@shared/constants';
import { HeaderFooterFacadeService } from '@shared/services/global/layout-service/header-footer-facade.service';
import {CommunityComponent} from '../actions/community-modal/community-modal.component';
import {ModalCustomService} from '../../../../../../common/shared/services/global';
import {openChat} from 'zmp-sdk/apis';
import {Router} from '@angular/router';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class AppHeaderComponent {
  private readonly facade = inject(HeaderFooterFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private router = inject(Router);

  cfg?: IHeaderConfig;
  user?: IResUserInfo | null;
  isSearchModalOpen = signal(false);
  constructor(
    private _modalService: ModalCustomService,
  ) {
    this.facade.header$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cfg => {
        this.cfg = cfg;
        this.cdr.markForCheck();
      });

    this.facade.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(u => {
        this.user = u;
        this.cdr.markForCheck();
      });
  }
  goToSearch(): void {
    this.router.navigate([uriFeConst.product.search]);
  }

  onMenuBarClick() {
    this._modalService.openIntro(CommunityComponent, {
      size: 'md',
      modalDialogClass: 'modal-community',
    });
  }

  isTitle(c: IHeaderConfig): c is IHeaderTitleConfig {
    return c.variant === 'title';
  }

  openSupportChat() {
    openChat({type: 'oa', id: '900441440596624596', message: 'Xin chào'});
  }

  back(): void {
    this.facade.back();
  }

  protected readonly uriFeConst = uriFeConst;
}
