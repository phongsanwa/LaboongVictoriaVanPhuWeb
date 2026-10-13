import {ChangeDetectorRef, Component, OnDestroy, OnInit, ElementRef} from "@angular/core";
import {IResProductInList, IResProductPromotion} from '@shared/models/api';
import { interval, Subject, takeUntil} from 'rxjs';
import {HomeManageService} from '@shared/services/global/home/home-cache.service';
import {uriFeConst} from '@shared/constants';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';

@Component({
  selector: 'app-product-flash-sale',
  templateUrl: './flashsale.component.html',
  styleUrls: [`flashsale.component.scss`],
  standalone: false
})

export class ProductFlashSaleComponent implements OnInit, OnDestroy {
  promotionData!: IResProductPromotion;
  products: IResProductInList[] = [];
  timeLeft = { hours: '00', minutes: '00', seconds: '00' };
  endDate!: Date;

  constructor(
    private homeManageService: HomeManageService,
    private appFm: AppFormAddService
  ) {}

  ngOnInit() {
    const params = {
      pageSize: 20,
      loadAttr: 1
    };

    // @TODO Tạm commnet do chưa có API
    // this.homeManageService.getProductPromotionOnce(params)
    //   .pipe(takeUntil(this.appFm.destroyed))
    //   .subscribe(promo => {
    //     if (!promo) { return; }
    //
    //     this.promotionData = promo;
    //     this.products = promo.product ?? [];
    //
    //     const endStr = promo.promotion?.endDate;
    //     if (endStr) {
    //       this.endDate = new Date(`${endStr}T23:59:59`);
    //       this.startCountdown();
    //     } else {
    //       console.warn();
    //     }
    //   });
  }

  ngOnDestroy() {
    this.appFm.getDestroySubs();
  }

  startCountdown() {
    if (!this.endDate) return;

    interval(1000)
      .pipe(takeUntil(this.appFm.destroyed))
      .subscribe(() => {
        const now = Date.now();
        const distance = this.endDate.getTime() - now;

        if (distance <= 0) {
          this.timeLeft = { hours: '00', minutes: '00', seconds: '00' };
          return;
        }

        const hours = Math.floor((distance / (1000 * 60 * 60)));
        const minutes = Math.floor((distance / (1000 * 60)) % 60);
        const seconds = Math.floor((distance / 1000) % 60);

        this.timeLeft = {
          hours: this.pad(hours),
          minutes: this.pad(minutes),
          seconds: this.pad(seconds)
        };
      });
  }

  pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  protected readonly uriFeConst = uriFeConst;
}
