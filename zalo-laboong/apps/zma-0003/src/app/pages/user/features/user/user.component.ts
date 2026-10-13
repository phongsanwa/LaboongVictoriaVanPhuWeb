import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from "@angular/core";
import {ActivatedRoute} from "@angular/router";
import {finalize, Subscription, takeUntil} from "rxjs";
import {NgbActiveModal, NgbOffcanvasOptions} from "@ng-bootstrap/ng-bootstrap";
import {IResAppInfo, IResUserInfo} from "@core/models/zmp.model";
import {ZmpService} from "@core/services/zmp-service/zmp.service";
import {NotifyService} from "@core/services";
import {ModalCustomService, OffcanvasCustomService} from "@shared/services/global";
import {uriFeConst} from "@shared/constants";
import {AllScope} from "@shared/models/feature-specific/zmp.model";
import {AppCommonComponent} from "@shared/components/app-common.service";
import {UserManageService} from '@shared/services/global/user/user-manage.service';
import {CreateShortcutComponent} from '@shared/components/modals/create-shortcut/create-shortcut.component';
import {IResStatusTrackingOrder} from '@shared/models/api';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {environment} from '../../../../../environments';
@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
  encapsulation: ViewEncapsulation.None,
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
    private userMsService: UserManageService,
    private offCanvasService: OffcanvasCustomService
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
    this.setHeader({variant: 'title', show: false, back: true, title: 'Thành viên'});

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
      mobile: this.appService.getUserInfo && this.appService.getUserInfo.phoneNumber ?
        this.appService.getUserInfo.phoneNumber : '0868323415',
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

    });
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  grantPermission() {
    if (this.isGranting) return;
    this.isGranting = true;

    const scopes: AllScope[] = ['scope.userInfo', 'scope.userPhonenumber'];

    this.spinner.show()
    this.userMsService.grantPermissionAndFetchUser$(scopes)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          this.isGranting = false;
          this.spinner.hide()
        })
      )
      .subscribe({
        next: (res) => {
          if (!res) {
            this._notify.error('Có lỗi xảy ra khi xin quyền.');
            return;
          }

          const {perms, userInfo} = res;

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
    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };

    const ref = this.offCanvasService.open(CreateShortcutComponent, opts);
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
  }

  protected readonly uriFeConst = uriFeConst;
}

@Component({
  selector: 'app-share-modal',
  styleUrls: ['./user.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="modal-body text-center p-0 modal-share">
      <img class="w-100 img-banner-qr" [src]="'assets/img/banner_share.png'" alt="QR Code">
      <div class="p-3">
        <p class="fw-bold fs-4">Chia sẻ đường dẫn</p>
        <p class="text-muted m-0">Hãy chia sẻ ngay đường dẫn cho bạn bè để kết bạn nhanh chóng, bảo mật</p>
      </div>

      <div class="row p-3 pt-0 g-2">
        <div class="col-6 d-flex flex-column rounded-3">
          <div class="border border-dark p-2 rounded-3 h-100" (click)="onCopyLink()">
            <i class="ph-bold ph-copy" style="font-size: 35px"></i>
            <p class="m-0 mt-2">Sao chép đường dẫn</p>
          </div>
        </div>
        <div class="col-6 d-flex flex-column rounded-3">
          <div class="border border-dark p-2 rounded-3 h-100" style="background: var(--brand-color)"
               (click)="shareZaloMiniApp()">
            <span class="style_logo">
              Zalo
            </span>
            <p class="text-white m-0 mt-2">Chia sẻ nhanh bạn bè trên zalo</p>
          </div>
        </div>
      </div>
    </div>
    <!--    <div class="modal-footer justify-content-center p-1">-->
    <!--      <button type="button" class="btn btn-primary" (click)="activeModal.close()">Đóng</button>-->
    <!--    </div>-->
  `
})
export class ComponentShareModal implements OnInit {

  @Input() shareData!: { shareLink: string };
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

  shareZaloMiniApp() {
    const {name, description, logoUrl} = this.appInfo || {};
    if (!name) return;

    this.zmpService.shareZaloMiniApp$({
      title: name,
      description,
      thumbnail: logoUrl,
    }).subscribe();
  }
  protected readonly uriFeConst = uriFeConst;
  protected readonly environment = environment;
}
