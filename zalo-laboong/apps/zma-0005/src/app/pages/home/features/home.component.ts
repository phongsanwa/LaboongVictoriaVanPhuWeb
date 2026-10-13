import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import {
  IHeaderConfig,
  IHeaderGreetingConfig,
} from '@shared/models/global';
import { IResUserInfo } from '@core/models/zmp.model';
import {uriFeConst} from '@shared/constants';
import { HeaderFooterFacadeService } from '@shared/services/global/layout-service/header-footer-facade.service';
import { UserService } from '@core/services/user.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppCommonComponent } from '@shared/components/app-common.service';
import {catchError, forkJoin, of, Subject, takeUntil} from 'rxjs';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {IResBanner, IResLoadCategory, IResProduct} from '@shared/models/api';
import {BannerCacheService} from '@shared/services/global/banner/banner-cache.service';
import {openChat, minimizeApp} from 'zmp-sdk/apis'
import {ComponentShareModal} from '../../user/features/user/user.component';
import {IResAppInfo} from "@core/models/zmp.model";
import {ModalCustomService} from "@shared/services/global";
import {ZmpService} from "@core/services/zmp-service/zmp.service";
import {switchMap, tap} from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})

export class HomeComponent extends AppCommonComponent implements OnInit, OnDestroy {
  private readonly headerFacade = inject(HeaderFooterFacadeService);
  private readonly usrService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private homeManageService = inject(HomeManageService);
  private destroy$ = new Subject<void>();
  products: IResProduct[] = [];
  banners: IResBanner[] = [];
  middleBanners: IResBanner[] = [];
  appInfo!: IResAppInfo;
  categories: IResLoadCategory[] = [];
  cfg?: IHeaderConfig;
  user?: IResUserInfo | null;

  constructor(
    private bannerCacheService: BannerCacheService,
    private _modalService: ModalCustomService,
    private zmpService: ZmpService,
  ) {
    super();
  }
  ngOnInit(): void {
    // 1️⃣ Cấu hình Header & Footer
    this.setHeader({
      variant: 'greeting',
      showGreetingText: true,
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
      className: 'footer',
    });

    // 2️⃣ Lắng nghe thay đổi Header
    this.headerFacade.header$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cfg) => {
        this.cfg = cfg;
        this.cdr.markForCheck();
      });

    // 3️⃣ Lắng nghe thông tin user
    this.usrService.userInfo$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u) => {
        this.user = u;
        this.cdr.markForCheck();
      });

    const params = {
      limit: 10
    }
    this.homeManageService.getProductsOnce(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.products = list?.result ?? [];
        this.cdr.markForCheck();
      });

    const categories$ = this.homeManageService.getCategoriesOnce()
      .pipe(catchError(() => of([] as IResLoadCategory[])));

    const banners$ = this.bannerCacheService.getBannerMainOnce({
      positionCode: 'BANNER_MIDDLE_MINI_APP',
    }).pipe(catchError(() => of([] as IResBanner[])));

    forkJoin({categories: categories$, banners: banners$})
      .pipe(
        tap(({categories, banners}) => {
          this.categories = categories ?? [];
          this.middleBanners = banners ?? [];
        }),
        switchMap(() => this.appService.closeSplashOnce$()),
        takeUntil(this.destroyed)
      )
      .subscribe();

    this.zmpService.getAppInfo$().subscribe({
      next: res => {
        this.appInfo = res as IResAppInfo;
      }
    })
  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  // ⚙️ Type guards cho Header
  isGreeting(c?: IHeaderConfig): c is IHeaderGreetingConfig {
    return !!c && c.variant === 'greeting';
  }

  minimizeOpenChat() {
    minimizeApp()
      .then(() => {
        openChat({type: 'user', id: '900441440596624596', message: 'Xin chào'});
      })
      .catch((err) => {
        console.error('Lỗi khi thu nhỏ hoặc mở chat:', err);
      });
  }

  onShareClick() {
    const shareData = {
      shareLink: this.appInfo.appUrl
    };
    const refModal = this._modalService.openIntro(ComponentShareModal, {
      size: 'lg',
      modalDialogClass: 'custom-modal-share modal-dialog-bottom',
    });
    refModal.componentInstance.shareData = shareData;
  }

  protected readonly uriFeConst = uriFeConst;
}
