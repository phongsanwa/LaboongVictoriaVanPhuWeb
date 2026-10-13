import {Component, inject} from '@angular/core';
import {AppService} from '@core/services';
import {RenderCodesComponent} from '@shared/components/actions';

@Component({
  selector: 'app-qrcode-offcanvas',
  standalone: true,
  template: `
    <div class="qr-sheet px-3 pb-4 pt-2">
      <div class="drag-line"></div>

      <div class="qr-title text-center mt-2">
        Quét QR để liên hệ
      </div>

      <div class="qr-wrapper mt-3 d-flex justify-content-center">
        <app-render-codes
          [data]="qrValue"
          mode="qr"
          [qrSize]="200"
          [showValueUnderBarcode]="false">
        </app-render-codes>
      </div>
    </div>
  `,
  imports: [
    RenderCodesComponent
  ],
  styles: [`
    .qr-sheet {
      background: #fff;
      border-radius: 16px 16px 0 0;
      text-align: center;

      .drag-line {
        width: 60px;
        height: 5px;
        background: #ddd;
        border-radius: 5px;
        margin: 0 auto 10px auto;
      }

      .qr-title {
        font-size: 18px;
        font-weight: 600;
      }

      .qr-wrapper {
        .qr-image {
          width: 220px;
          height: 220px;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      }
    }
  `]
})
export class QrcodeOffcanvasComponent {
  qrValue = '';

  constructor(private appService: AppService) {
    this.qrValue = this.appService.getUserInfo?.phoneNumber || '0868323415';
  }
}
