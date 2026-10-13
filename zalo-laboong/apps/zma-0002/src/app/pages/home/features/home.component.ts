import {ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal} from "@angular/core";
import {AppCommonComponent} from '@shared/components/app-common.service';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {catchError, of, Subject, takeUntil} from 'rxjs';
import {BANNER_POSITION_CODE, IResBanner, IResLoadCategory, PRODUCT_FEATURE} from '@shared/models/api';
import {uriFeConst} from '@shared/constants';
import {BannerCacheService} from '@shared/services/global/banner/banner-cache.service';
import {switchMap, tap} from 'rxjs/operators';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {OffcanvasCustomService} from '@shared/services/global';
import {ContactOffcanvasComponent} from '../../../components/action/contact/contactModal.component';
import {AppConfigStateService} from '@core/services/app-config-state.service';
import {IResAppInfo} from '@core/models/zmp.model';
import {ZmpService} from '@core/services';
import {environment} from '../../../../environments';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false
})

export class HomeComponent extends AppCommonComponent implements OnInit, OnDestroy {

  private cd = inject(ChangeDetectorRef);
  private homeManageService = inject(HomeManageService);
  private destroy$ = new Subject<void>();
  categories: IResLoadCategory[] = [];
  private readonly offcanvasSvc = inject(OffcanvasCustomService);
  private readonly configState = inject(AppConfigStateService);
  private readonly zmpService = inject(ZmpService);

  slides: IResBanner[] = [];
  private readonly fallbackSlide = {
    id: 0,
    name: 'Clothing store banner',
    imageUrl: 'assets/img/no-image.png',
    image: 'assets/img/no-image.png',
    displayOrder: 0,
    description: '',
    content: '',
  } as IResBanner;
  displaySlides: IResBanner[] = [];
  categorySlides: Array<IResLoadCategory & { image: string; routerLink: string; queryParams: { id: string | number } }> = [];
  appInfo?: IResAppInfo;

  constructor(
    private bannerCacheService: BannerCacheService,
  ) {
    super();
  }

  isLoadingBanner = signal(true);
  isLoadingCategories = signal(true);
  readonly skeletonItems = [1, 2, 3, 4];
  ngOnInit() {
    this.setHeader({
      variant: 'greeting',
      show: true,
      showGreetingText: false
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
      className: 'footer',
    });

    this.homeManageService.getCategoriesOnce()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.categories = Array.isArray(list) ? list : [];
        this.categorySlides = this.categories.map(cate => ({
          ...cate,
          image: cate.image || 'assets/img/no-image.png',
          routerLink: uriFeConst.product.category,
          queryParams: {id: cate.id},
        }));
        this.isLoadingCategories.set(false);
        this.cd.markForCheck();
      });

    this.zmpService.getAppInfo$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.appInfo = res as IResAppInfo;
          this.cd.markForCheck();
        }
      });

    this.bannerCacheService.getBannerMainOnce({ positionCode: BANNER_POSITION_CODE.SLIDE })
      .pipe(
        catchError(() => of([] as IResBanner[])),
        tap(banners => {
          this.slides = (banners ?? []).map(b => ({
            ...b,
            image: b.imageUrl ?? 'assets/img/no-image.png',
            href: b.link,
          }));
          this.displaySlides = this.slides.length
            ? this.slides
            : this.showTemplateFallbacks ? [this.fallbackSlide] : [];
          this.isLoadingBanner.set(false);
          this.cd.markForCheck();
        }),
        switchMap(() => this.appService.closeSplashOnce$()),
        takeUntil(this.destroy$)
      )
      .subscribe();

  }

  onChangeContact() {
    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };
    const ref = this.offcanvasSvc.open(ContactOffcanvasComponent, opts);
  }


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.getDestroySubs();
  }

  get displayCategories(): IResLoadCategory[] {
    return Array.isArray(this.categories) ? this.categories : [];
  }

  get appDisplayName(): string {
    return this.configState.headerTitle
      || this.configState.appTitle
      || this.appInfo?.name
      || (this.showTemplateFallbacks ? 'Clothing Store' : '');
  }

  get brandLogoUrl(): string {
    return this.configState.appLogoUrl || this.appInfo?.logoUrl || '';
  }

  get showTemplateFallbacks(): boolean {
    return !!environment.showTemplateFallbacks;
  }

  protected readonly uriFeConst = uriFeConst;
  protected readonly PRODUCT_FEATURE = PRODUCT_FEATURE;
  protected readonly environment = environment;
}
