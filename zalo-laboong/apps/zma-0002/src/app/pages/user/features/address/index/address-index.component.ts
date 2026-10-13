import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {CheckoutManageService} from '@shared/services/global';
import {AddressCacheService} from '@shared/services/api';
import {IAddressItem} from '@shared/models/api';
import {Router} from '@angular/router';
import {uriFeConst} from '@shared/constants';


@Component({
  selector: 'app-address-index',
  templateUrl: './address-index.component.html',
  styleUrls: [`./address-index.component.scss`],
  standalone: false
})

export class AddressIndexComponent extends AppCommonComponent implements OnInit, OnDestroy {
  addresses: IAddressItem[] = [];
  loading = false;

  constructor(
    private addressCacheSer: AddressCacheService,
    private checkoutSer: CheckoutManageService,
    private router: Router,
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Sổ địa chỉ'});
    this.setFooter({variant: 'tabs', show: false});

    this.loadAddresses();
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  /**
   * Tải danh sách địa chỉ theo luồng deviceId + version (mục 5.4 doc):
   * AddressCacheService tự quyết định dùng cache local hay gọi lại API.
   */
  loadAddresses(forceReload = false): void {
    this.loading = true;
    this.addressCacheSer.getAddressList(forceReload).subscribe({
      next: (list: IAddressItem[]) => {
        this.addresses = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  hasAddresses(): boolean {
    return this.addresses.length > 0;
  }

  /** Ghép địa chỉ hiển thị: số nhà/đường + phường + quận + tỉnh */
  addressLine(item: IAddressItem): string {
    return [item.address, item.wardName, item.districtName, item.provinceName]
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Chọn 1 địa chỉ để dùng cho đơn hàng đang đặt: set vào CheckoutManageService,
   * đồng thời set làm địa chỉ mặc định trong sổ (nếu chưa phải mặc định), rồi quay lại.
   */
  onSelectAddress(item: IAddressItem): void {
    this.checkoutSer.setLocation({
      cityId: item.shipToCityLocationId ?? 0,
      districtId: item.shipToDistrictLocationId ?? 0,
      wardId: item.shipToWardLocationId ?? 0,
      cityName: item.provinceName ?? '',
      districtName: item.districtName ?? '',
      wardName: item.wardName ?? '',
    });

    if (item.isDefault !== 1) {
      this.addressCacheSer.setDefaultAddress({id: item.id}).subscribe();
    }

    if ((window.history?.length || 0) > 1) {
      window.history.back();
    } else {
      this.router.navigate([uriFeConst.user.address]);
    }
  }

  onRemoveAddress(item: IAddressItem): void {
    const confirmDelete = confirm(`Bạn có chắc muốn xoá địa chỉ của "${item.recipientName}" không?`);
    if (!confirmDelete) return;

    this.addressCacheSer.deleteAddress({id: item.id}).subscribe({
      next: () => {
        this.notifyService.success('Xóa địa chỉ thành công');
        this.loadAddresses(true);
      },
      error: () => {
        this.notifyService.error('Xóa địa chỉ không thành công, vui lòng thử lại');
      },
    });
  }

  protected readonly uriFeConst = uriFeConst;
}