import { Component, OnDestroy, OnInit, signal} from '@angular/core';
import {uriFeConst} from '@shared/constants';
import {I18nFormatCurrencyAmountPipe} from '@shared/pipes/global';
import {IResProduct, IResProductPromotion} from '@shared/models/api';
import { takeUntil} from 'rxjs';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {RouterModule} from '@angular/router';


interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

@Component({
  selector: 'app-product-flash-sale',
  templateUrl: './flashsale.component.html',
  styleUrls: ['./flashsale.component.scss'],
  standalone: true,
  imports: [
    I18nFormatCurrencyAmountPipe,
    RouterModule
  ]
})

export class FlashSaleComponent implements OnInit, OnDestroy {
  products: IResProduct[] = [];
  private intervalId: any;
  countdown = signal<Countdown>({days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false});
  promotionData!: IResProductPromotion;
  endDate!: Date;

  constructor(
    private homeManageService: HomeManageService,
    private appFm: AppFormAddService
  ) {
  }

  ngOnInit() {
    this.flashaleProduct();

  }
  ngOnDestroy() {
    this.appFm.getDestroySubs();
  }

  startCountdown() {
    if (!this.endDate) return;

    const targetTime = this.endDate.getTime();

    this.intervalId = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance < 0) {
        clearInterval(this.intervalId);
        this.countdown.set({
          days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true
        });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      this.countdown.set({days, hours, minutes, seconds, isExpired: false});
    }, 1000);
  }

  flashaleProduct() {
    const params = { limit: 20, loadAttr: 1 };

    this.homeManageService.getProductPromotionOnce(params)
      .pipe(takeUntil(this.appFm.destroyed))
      .subscribe(promo => {
        if (!promo) return;

        this.promotionData = promo;
        this.products = promo.product ?? [];

        const endStr = promo.promotion?.endDate;

        if (endStr) {
          this.endDate = new Date(`${endStr}T23:59:59`);
          this.startCountdown();
        }
      });
  }

  formatNumber(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  protected readonly uriFeConst = uriFeConst;
}
