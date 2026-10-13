import {ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit, ViewEncapsulation} from "@angular/core";
import {AppCommonComponent} from '@shared/components/app-common.service';
import {Observable, of, Subject, takeUntil} from 'rxjs';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {IResBanner, IResLoadCategory, IResProduct} from '@shared/models/api';
import {uriFeConst} from "@shared/constants";
import {ActivatedRoute, Router} from '@angular/router';
import {BannerCacheService} from '@shared/services/global/banner/banner-cache.service';
import { MOCK_BANNERS, MOCK_CATEGORIES, MOCK_PRODUCTS } from '../mock';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: [`/home.component.scss`],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})

export class HomeComponent extends AppCommonComponent implements OnInit, OnDestroy {
  private cd = inject(ChangeDetectorRef);
  private homeManageService = inject(HomeManageService);
  private destroy$ = new Subject<void>();
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  categories: IResLoadCategory[] = [];
  newProducts: IResProduct[] = [];
  homeProducts: IResProduct[] = [];
  // banner
  banners: IResBanner[] = [];
  isDemoMode = false;
  featureItems = [
    { title: 'Tất cả tour', icon: 'ph-bold ph-flag text-warning', link: uriFeConst.product.category },
    { title: 'Tin tức', icon: 'ph-bold ph-megaphone text-purple', link: '/news' },
    { title: 'Mini game', icon: 'ph-bold ph-circle-notch text-danger', link: uriFeConst.game },
    { title: 'CTV', icon: 'ph-bold ph-handshake text-primary', link: '/' }
  ];
  destinations = [
    {
      name: 'Lào Cai',
      image: 'https://vcdn1-dulich.vnecdn.net/2024/02/20/Caotoc-3017-1708419387.jpg?w=0&h=0&q=100&dpr=1&fit=crop&s=Zq6nV4CLl26lvB_2m0602g'
    },
    {
      name: 'Hưng Yên',
      image: 'https://cdn.tgdd.vn/Files/2023/05/27/1531840/trai-nghiem-du-lich-van-giang-hung-yen-voi-5-dia-diem-dong-khach-202305272234485255.jpg'
    },
    {
      name: 'Sơn La',
      image: 'https://media.baosonla.org.vn/public/hoaht/2024-09-27/diem-du-lich-sinh-thai-thac-dai-yem,-huyen-moc-chau(1).jpg'
    },
    {
      name: 'Hòa Bình',
      image: 'https://vcdn1-dulich.vnecdn.net/2022/05/12/maichauhideawaylakeresort12116-2557-3347-1652355363.jpg?w=1200&h=0&q=100&dpr=1&fit=crop&s=ArgnARX1jUyOi7RJbQc5Ew'
    },
    {
      name: 'Nam Định',
      image: 'https://xevietnam.com/wp-content/uploads/2020/06/bai-bien-long-thinh-nam-dinh.jpg'
    }
  ];

  constructor(
    private bannerCacheService: BannerCacheService,
  ) {
    super();
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
    if (this.isDemoMode) {
      console.log('DEMO MODE: Sử dụng mock data');
    } else {
      console.log('PRODUCTION MODE: Sử dụng API data');
    }
    // Kiểm tra query param state=demo
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.isDemoMode = params['state'] === 'demo';
      });

    // Load categories - sử dụng mock hoặc API
    this.getCategoriesData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => {
        this.categories = (list ?? []).filter(c => !c.parentId);
        this.cd.markForCheck();
      });

    // Load banners - sử dụng mock hoặc API
    this.getBannersData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(banners => {
        this.banners = banners ?? [];
        this.cd.markForCheck();
      });

    this.loadProducts();

  }

  /**
   * Lấy categories từ mock hoặc API
   */
  private getCategoriesData(): Observable<IResLoadCategory[]> {
    if (this.isDemoMode) {
      console.log('Loading categories from mock data');
      return of(MOCK_CATEGORIES);
    }
    return this.homeManageService.getCategoriesOnce();
  }

  /**
   * Lấy banners từ mock hoặc API
   */
  private getBannersData(): Observable<IResBanner[]> {
    if (this.isDemoMode) {
      console.log('Loading banners from mock data');
      return of(MOCK_BANNERS);
    }
    return this.bannerCacheService.getBannerMainOnce({
      positionCode: 'BANNER_TOP_MINI_APP',
    });
  }

  /**
   * Lấy products từ mock hoặc API
   */
  private getProductsData(params: any): Observable<any> {
    if (this.isDemoMode) {
      console.log('Loading products from mock data');
      return of({ result: MOCK_PRODUCTS });
    }
    return this.homeManageService.getProductsOnce(params);
  }

  loadProducts(): void {
    const params = {
      limit: 10
    }

    this.getProductsData(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        const allProducts = res?.result ?? res ?? [];
        this.newProducts = allProducts;
        this.homeProducts = allProducts;
        this.cd.markForCheck();
      });
  }

  goToSearch(): void {
    this.router.navigate(['/product/search']);
  }
  ngOnDestroy() {
    this.getDestroySubs();
  }

  protected readonly uriFeConst = uriFeConst;
}
