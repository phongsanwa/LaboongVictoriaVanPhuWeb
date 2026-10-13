import {Component, OnDestroy, OnInit} from "@angular/core";
import {catchError, finalize, forkJoin, of, takeUntil} from 'rxjs';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from "@shared/constants";
import {BannerCacheService} from '@shared/services/global/banner/banner-cache.service';
import {switchMap, tap} from 'rxjs/operators';
import {NewsCategoryCacheService} from '@shared/services/global/news/news-cache.service';
import {environment} from '../../../../environments';
import {BANNER_POSITION_CODE, IResBanner, IResLoadCategory, PRODUCT_FEATURE} from '@shared/models/api';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false
})

export class HomeComponent extends AppCommonComponent implements OnInit, OnDestroy {
  categories: IResLoadCategory[] = [];

  slides: IResBanner[] = [];

  constructor(
    private bannerCacheService: BannerCacheService,
    private homeManageService: HomeManageService,
    private newsCache: NewsCategoryCacheService,
  ) {
    super();
  }

  ngOnInit() {
    this.newsCache.clearCache();
    this.setHeader({
      variant: 'greeting',
      showGreetingText: true
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
      className: 'footer',
    });

    const categories$ = this.homeManageService.getCategoriesOnce()
      .pipe(catchError(() => of([] as IResLoadCategory[])));

    const banners$ = this.bannerCacheService.getBannerMainOnce({
      positionCode: BANNER_POSITION_CODE.SLIDE,
    }).pipe(catchError(() => of([] as IResBanner[])));
    forkJoin({categories: categories$, banners: banners$})
      .pipe(
        tap(({categories, banners}) => {
          this.categories = categories ?? [];
          this.slides = (banners ?? []).map(b => ({
            ...b,
            image: b.imageUrl ?? 'assets/img/no-image.png',
          }));
        }),
        switchMap(() => this.appService.closeSplashOnce$()),
        takeUntil(this.destroyed),
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  protected readonly uriFeConst = uriFeConst;
  protected readonly environment = environment;
  protected readonly PRODUCT_FEATURE = PRODUCT_FEATURE;
}
