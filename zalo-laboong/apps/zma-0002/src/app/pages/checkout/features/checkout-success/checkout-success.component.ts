import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import { uriFeConst } from 'common/shared/constants';

@Component({
  selector: 'app-checkout-success',
  standalone: false,
  template: `
    <div class="success-screen-container py-4 px-3">
      <div class="icon-wrapper">
        <div class="check-icon">
          <img [src]="'assets/img/success.png'" alt="" class="success-illustration"/>
        </div>
      </div>
      <p class="main-text">Thanh toán thành công</p>
      <p class="order-id-text">Mã số đơn hàng của bạn là <span>{{ orderId }}</span></p>
      <p class="info-text">Bạn có thể xem chi tiết trong
        <a [routerLink]="uriFeConst.order.trackingDetail"
           [queryParams]="{id: orderId}">đơn hàng của tôi</a>.</p>
      <button class="primary-btn" [routerLink]="'/'">TRỞ VỀ TRANG CHỦ</button>
    </div>
  `,
  styles: [`
    .success-screen-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #fff;
      border-radius: 10px;
      padding: 20px;
      max-width: 400px;
      margin: 50px auto;
      text-align: center;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
    }

    .icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .check-icon {
      font-size: 48px;
      color: #fff;
      line-height: 1;
    }

    .main-text {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 10px;
    }

    .order-id-text {
      font-size: 16px;
      color: #333;
      margin-bottom: 5px;
    }

    .order-id-text span {
      color: #28a745;
      font-weight: 600;
    }

    .info-text {
      font-size: 14px;
      color: #666;
      margin-bottom: 25px;
    }

    .info-text a {
      color: #007bff;
      text-decoration: none;
    }

    .primary-btn {
      background-color: #1877F2;
      color: #fff;
      border: none;
      padding: 12px 20px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
      width: 100%;
      font-weight: 600;
    }

    .primary-btn:hover {
      opacity: 0.9;
    }
  `]
})

export class CheckoutSuccessComponent extends AppCommonComponent implements OnInit {
  orderId = 0;


  constructor() {
    super();
  }

  ngOnInit() {
    this.orderId = this.navService.getParam('orderId') ?? 0;
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Thanh toán thành công',
    });
  }

  protected readonly uriFeConst = uriFeConst;
}
