import {ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {AppCommonComponent} from '@shared/components/app-common.service';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {catchError, finalize, forkJoin, of, Subject, takeUntil} from 'rxjs';
import { IResUserInfo, IUserApiResponse} from '@core/models/zmp.model';
import {uriFeConst} from "@shared/constants";
import {BannerCacheService} from '@shared/services/global/banner/banner-cache.service';
import {LayoutComponent} from '../../../layout/layout.component';
import {AllScope} from '@shared/models/feature-specific/zmp.model';
import {UserManageService} from '@shared/services/global/user/user-manage.service';
import {IResBanner, IResLoadCategory, IResProduct} from '@shared/models/api';
import {switchMap, tap} from 'rxjs/operators';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: [`/home.component.scss`],
  standalone: false,
})

export class HomeComponent extends AppCommonComponent implements OnInit, OnDestroy {
  private homeManageService = inject(HomeManageService);
  private destroy$ = new Subject<void>();
  private cd = inject(ChangeDetectorRef);
  categories: IResLoadCategory[] = [];
  user = signal<IUserApiResponse | null>(null);
  slides: IResBanner[] = [];
  userInfo!: IResUserInfo;
  products: IResProduct[] = [];
  private isGranting = false

  nameSearch = [
    {
      name: 'Sashimi Tươi',
      image:
        'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764668758/sashimituoi_a98gpi.png',
    },
    {
      name: 'Lẩu Tại Gia',
      image:
        'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764669058/lautaigia_gdpidk.png',
    },
    {
      name: 'Tiệc BBQ',
      image:
        'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764669116/tiecbbq_n8fdrl.jpg',
    },
    {
      name: 'Trái cây',
      image:
        'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764669206/traicayy_xwjmmm.png',
    },
    {
      name: 'Ăn vặt',
      image: 'https://res.cloudinary.com/dp1jdwwak/image/upload/v1764669299/anvatne_gxt6wf.jpg'
    }
  ];


  constructor(
    private bannerCacheService: BannerCacheService,
    private appComponent: LayoutComponent,
    private userMsService: UserManageService
  ) {
    super();
    this.userService.userInfo$
      .subscribe(info => {
        if (info) {
          this.userInfo = info;
        }
      });
  }

  ngOnInit() {
    this.setHeader({
      variant: 'greeting',
      showGreetingText: true
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
      className: 'footer',
    });

    this.homeManageService.getCategoriesOnce()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.categories = list ?? [];
        this.cd.markForCheck();
      });

    const banners$ = this.bannerCacheService.getBannerMainOnce({
      positionCode: 'BANNER_TOP_MINI_APP',
    }).pipe(catchError(() => of([] as IResBanner[])));

    forkJoin({banners: banners$})
      .pipe(
        tap(({banners}) => {
          this.slides = banners ?? [];
        }),
        switchMap(() => this.appService.closeSplashOnce$()),
        takeUntil(this.destroyed)
      )
      .subscribe();

  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  onQuickSearch(name: string) {
    this.appComponent.searchModal$.next(name);
  }

  grantPermission() {
    if (this.isGranting) return;
    this.isGranting = true;

    const scopes: AllScope[] = ['scope.userInfo', 'scope.userPhonenumber'];

    this.spinner.show()
    this.userMsService.grantPermissionAndFetchUser$(scopes)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          this.isGranting = false;
          this.spinner.hide()
        })
      )
      .subscribe({
        next: (res) => {
          if (!res) {
            this.notifyService.error('Có lỗi xảy ra khi xin quyền.');
            return;
          }

          const {perms, userInfo} = res;

          if (userInfo) {
            this.userService.saveGrantAndUser(perms, userInfo);
            this.notifyService.success('Đã cập nhật thông tin người dùng.');
            this.navService.redirect([uriFeConst.user.profile]);
            return;
          }

          const missing = scopes.filter(s => !perms?.[s]);
          if (missing.length) {
            this.notifyService.warning('Bạn chưa cấp đủ quyền cần thiết (User info / Phone).');
          } else {
            this.notifyService.error('Không thể lấy thông tin người dùng.');
          }
        },
        error: (err) => {
          this.notifyService.error('Đã xảy ra lỗi khi cấp quyền.');
        }
      });
  }

  //có quyền thì mới redirect sang /user/profile
  handleLinkToProfile() {
    const scopes: AllScope[] = ['scope.userInfo', 'scope.userPhonenumber'];

    const granted = this.userService.getGrantedScopes();
    const isGrantedAll = scopes.every(s => granted.includes(s));

    if (isGrantedAll) {
      this.navService.redirect([uriFeConst.user.profile]);
      return;
    }

    // Nếu chưa -> gọi xin quyền
    this.grantPermission();
  }


  protected readonly uriFeConst = uriFeConst;
}
