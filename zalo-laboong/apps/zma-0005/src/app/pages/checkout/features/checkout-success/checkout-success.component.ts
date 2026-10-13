import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';

@Component({
  selector: 'app-checkout-success',
  template: `
    <div class="success-screen-container py-3 px-2">

      <div class="header-section">
        <div class="illustration-wrapper mb-3">
          <img [src]="'assets/img/shopping-cart-done.png'" alt="" class="success-illustration"/>
        </div>

        <p class="congratulations-text">Chúc mừng</p>
        <p class="status-text">Bạn đã mua hàng thành công</p>
      </div>

      <div class="action-buttons-group">
        <button class="action-button primary-btn" [routerLink]="'/'">Trang chủ</button>
        <button class="action-button secondary-btn" [routerLink]="uriFeConst.order.trackingDetail"
                [queryParams]="{id: orderId}">Đơn mua
        </button>
      </div>



    </div>
  `,
  styles: [`
    .header-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 20px;
    }

    .illustration-wrapper {
      width: 150px;
      height: 150px;
    }

    .success-illustration {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .congratulations-text {
      font-size: 18px;
      font-weight: 600;
      color: #28a745;
      margin: 5px 0;
    }

    .status-text {
      font-size: 14px;
      color: #333;
      margin: 0;
    }

    .action-buttons-group {
      display: flex;
      justify-content: space-around;
      padding: 0 10px;
      margin-bottom: 20px;
    }

    .action-button {
      flex: 1;
      margin: 0 5px;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
    }

    .primary-btn {
      background-color: var(--white);
      color: #333;
      border: 1px solid var(--brand-color);
    }

    .secondary-btn {
      background-color: #ffffff;
      color: #333;
      border: 1px solid var(--brand-color);
    }

    .recommendation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0 10px 0;
    }

    .recommendation-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .view-all-link {
      font-size: 14px;
      color: #666;
      cursor: pointer;
    }

    .recommendation-grid-placeholder {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      height: 300px;
      background-color: #f5f5f5;
    }
  `],
  standalone: false
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
      back: false,
      title: 'Thanh toán thành công',
    });
  }

  protected readonly uriFeConst = uriFeConst;
}
