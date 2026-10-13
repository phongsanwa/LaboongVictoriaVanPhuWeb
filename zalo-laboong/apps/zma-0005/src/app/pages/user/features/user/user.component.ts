import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {finalize, Subscription, takeUntil} from "rxjs";
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";
import {IResAppInfo, IResUserInfo} from "@core/models/zmp.model";
import {ZmpService} from "@core/services/zmp-service/zmp.service";
import {NotifyService} from "@core/services";
import {ModalCustomService} from "@shared/services/global";
import {uriFeConst} from "@shared/constants";
import {AllScope} from "@shared/models/feature-specific/zmp.model";
import {AppCommonComponent} from "@shared/components/app-common.service";
import {UserManageService} from '@shared/services/global/user/user-manage.service';
import {IResStatusTrackingOrder} from '@shared/models/api';
import {OrderApiService} from '@shared/services/api/order/order-api.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
  standalone: false
})
export class UserComponent extends AppCommonComponent implements OnInit, OnDestroy {
  appInfo!: IResAppInfo;
  userInfo!: IResUserInfo;
  private isGranting = false

  orderStatusData: IResStatusTrackingOrder[] = [];

  name = '';
  sub?: Subscription;
  @ViewChild('qrCodeImage') qrCodeImage!: ElementRef;

  constructor(
    private zmpService: ZmpService,
    private route: ActivatedRoute,
    private _modalService: ModalCustomService,
    private _notify: NotifyService,
    private orderApi: OrderApiService,
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
      showGreetingText: true,
      show: false,
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
    });

    this.zmpService.getAppInfo$().subscribe({
      next: res => {
        this.appInfo = res as IResAppInfo;
      }
    })

    const params = {
      mobile: '0868323415',
      act: 'status'
    }

    this.orderApi.getStatusTracking(params)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: res => {
          if (!res.code) return;
          this.orderStatusData = Array.isArray(res.data) ? res.data : [];
        }
      })

    this.sub = this.route.queryParamMap.subscribe(map => {
      this.name = map.get('name') ?? '';
      // console.log('name info alo', this.name)

    });
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  grantPermission() {
    if (this.isGranting) return;
    this.isGranting = true;

    const scopes: AllScope[] = ['scope.userInfo', 'scope.userPhonenumber'];

    this.userMsService.grantPermissionAndFetchUser$(scopes)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => { this.isGranting = false; })
      )
      .subscribe({
        next: (res) => {
          if (!res) {
            this._notify.error('Có lỗi xảy ra khi xin quyền.');
            return;
          }

          const { perms, userInfo } = res;

          if (userInfo) {
            this.userService.saveGrantAndUser(perms, userInfo);
            this._notify.success('Đã cập nhật thông tin người dùng.');
            return;
          }

          const missing = scopes.filter(s => !perms?.[s]);
          if (missing.length) {
            this._notify.warning('Bạn chưa cấp đủ quyền cần thiết (User info / Phone).');
          } else {
            this._notify.error('Không thể lấy thông tin người dùng.');
          }
        },
        error: (err) => {
          this._notify.error('Đã xảy ra lỗi khi cấp quyền.');
        }
      });
  }

  createShortcut() {
    this.zmpService.createShortcut$({ utm_source: 'shortcut' }).subscribe();
  }
  downloadQRCode() {
    const imageUrl = this.appInfo.qrCodeUrl;
    if (!imageUrl) return;

    this.zmpService.downloadImageToGallery$(imageUrl).subscribe();
  }

  onShareClick() {
    const shareData = {
      shareLink: this.appInfo.appUrl
    };
    const refModal = this._modalService.openIntro(ComponentShareModal, {
      size: 'sm',
      centered: true,
      modalDialogClass: 'custom-modal-share',
    });
    refModal.componentInstance.shareData = shareData;
    refModal.componentInstance.downloadCallback = () => this.downloadQRCode();
  }

  onCopyLink() {
    if (this.appInfo?.appUrl) {
      navigator.clipboard.writeText(this.appInfo.appUrl);
      this._notify.success('Đã sao chép đường dẫn');
    } else {
      this._notify.error('Không thể sao chép. Vui lòng thử lại.');
    }
  }

  shareZaloMiniApp() {
    const { name, description, logoUrl } = this.appInfo || {};
    if (!name) return;

    this.zmpService.shareZaloMiniApp$({
      title: name,
      description,
      thumbnail: logoUrl,
    }).subscribe();
  }

  protected readonly uriFeConst = uriFeConst;
}

@Component({
  selector: 'app-share-modal',
  styleUrls: ['./user.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-header p-2 h6 fw-normal d-flex align-items-center justify-content-between">
      Tham gia Minishop Store
      <i class="ph ph-x" (click)="activeModal.dismiss('close')"></i>
    </div>
    <div class="modal-body text-center p-0 modal-share">
      <img class="img-banner-qr mx-auto my-2" [src]="this.appInfo && this.appInfo.qrCodeUrl ? this.appInfo.qrCodeUrl : ''" alt="QR Code">
      <div class="px-3 mb-3">
        <p class="m-0">Mời bạn tham gia <span class="text-brand-color fw-semibold">"{{ this.appInfo.name }}"</span> - Mua sắm đơn giản qua đường dẫn hoặc Quét mã QR tải App.</p>
      </div>
      <div class="link w-75 mx-auto mb-2 text-brand-color" style="font-size: 11px;">{{ this.appInfo.appUrl }} <i class="ph ph-link text-brand-color"></i></div>
      <div class="row p-3 pt-0 g-2 pb-5">
        <div class="col-4 d-flex flex-column rounded-3">
          <div class="p-2 rounded-3 h-100" (click)="onCopyLink()">
            <i class="ph-bold ph-copy text-brand-color"></i>
            <p class="m-0 mt-1" style="font-size: 11px">Sao chép</p>
          </div>
        </div>
        <div class="col-4 d-flex flex-column rounded-3">
          <div class="p-2 rounded-3 h-100" (click)="shareZaloMiniApp()">
            <i class="ph-bold ph-share text-brand-color"></i>
            <p class="m-0 mt-1" style="font-size: 11px">Chia sẻ</p>
          </div>
        </div>
        <div class="col-4 d-flex flex-column rounded-3">
          <div class="p-2 rounded-3 h-100" (click)="downloadQRCode()">
            <i class="ph-bold ph-download text-brand-color"></i>
            <p class="m-0 mt-1" style="font-size: 11px">Lưu QR</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ComponentShareModal implements OnInit {

  @Input() shareData!: { shareLink: string };
  @Input() downloadCallback!: () => void;
  appInfo!: IResAppInfo;

  constructor(
    public activeModal: NgbActiveModal,
    private zmpService: ZmpService,
    private _notify: NotifyService,
  ) {
  }

  ngOnInit(): void {
    this.zmpService.getAppInfo$().subscribe({
      next: res => {
        this.appInfo = res as IResAppInfo;
      }
    })
  }

  onCopyLink() {
    if (this.shareData?.shareLink) {
      navigator.clipboard.writeText(this.shareData.shareLink);
      this.activeModal.close('link copied');
      this._notify.success('Đã sao chép đường dẫn');
    } else {
      this.activeModal.close('link copied');
      this._notify.error('Không thể sao chép. Vui lòng thử lại.');
    }

  }

  downloadQRCode() {
    if (this.downloadCallback) {
      this.downloadCallback();
      this.activeModal.close();
    } else {
      this._notify.error('Không thể tải QR. Thiếu callback.');
    }
  }

  shareZaloMiniApp() {
    const { name, description, logoUrl } = this.appInfo || {};
    if (!name) return;

    this.zmpService.shareZaloMiniApp$({
      title: name,
      description,
      thumbnail: logoUrl,
    }).subscribe();
  }

}
