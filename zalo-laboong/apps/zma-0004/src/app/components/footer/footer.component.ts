import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component, DoCheck,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit, SimpleChanges
} from '@angular/core';
import {DEFAULT_FOOTER, IFooterConfig, IFooterItem, IFooterTabsConfig} from '@shared/models/global';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {CartManageService} from '@shared/services/global/cart/cart-manage.service';
import {ProductManageService} from '@shared/services/global';
import {Subject, takeUntil} from 'rxjs';
import {ICartData} from '@shared/models/feature-specific';
import {uriFeConst} from '@shared/constants';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AppFooterComponent implements OnInit, OnChanges, OnDestroy, DoCheck {
  public prdService = inject(ProductManageService);
  @Input() items: IFooterItem[] = [];

  // state
  cfg: IFooterConfig = DEFAULT_FOOTER;
  itemsToRender: IFooterItem[] = this.items;
  @Input() cartData!: ICartData;

  // services
  readonly hf = inject(HeaderFooterFacadeService);
  private readonly cd = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();
  private prevTotalAmount: number = 0;
  private prevTotalQuantities: number = 0;

  constructor(
    public cartService: CartManageService,
  ) {
  }

  ngDoCheck(): void {
    const currentAmount = this.cartService.totalAmount;
    const currentQuantities = this.cartService.totalQuantities;
    if (currentAmount !== this.prevTotalAmount || currentQuantities !== this.prevTotalQuantities) {
      this.cd.markForCheck();
      this.prevTotalAmount = currentAmount;
      this.prevTotalQuantities = currentQuantities;
    }
  }


  ngOnInit(): void {
    this.cartService.handlerLoadData();

    this.prevTotalAmount = this.cartService.totalAmount;
    this.prevTotalQuantities = this.cartService.totalQuantities;


    this.hf.footer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cfg => {
        this.cfg = cfg;
        this.recomputeItemsToRender();
        this.cd.markForCheck();
      });

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.recomputeItemsToRender();
      this.cd.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isTabs(c: IFooterConfig): c is IFooterTabsConfig {
    return c?.variant === 'tabs';
  }

  private recomputeItemsToRender() {
    if (this.isTabs(this.cfg) && Array.isArray(this.cfg.items) && this.cfg.items.length) {
      this.itemsToRender = this.cfg.items;
    } else {
      this.itemsToRender = this.items;
    }
  }

  protected readonly uriFeConst = uriFeConst;
}
