import {Component, OnDestroy, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {CheckoutManageService} from '@shared/services/global/checkout/checkout-manage.service';
import {ISaveOrderParams} from '@shared/models/api';
import {takeUntil} from 'rxjs';
import {CustomerManageService} from '@shared/services/global';
import {CreateAddressModalComponent} from '@shared/components';
import {NgbOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {IAddress} from '@shared/models/global';
import {Router} from '@angular/router';
import {fullAddress} from '@shared/utils';

@Component({
  selector: 'app-create-address',
  templateUrl: 'create-address.component.html',
  styleUrls: ['create-address.component.scss'],
  standalone: false
})

export class CreateAddressComponent extends AppCommonComponent implements OnInit, OnDestroy {
  payload!: ISaveOrderParams;
  isAddressBook = false;

  constructor(
    private svc: CheckoutManageService,
    public customerSer: CustomerManageService,
    private offcanvas: NgbOffcanvas,
    private router: Router,
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Địa chỉ'});
    this.setFooter({variant: 'tabs', show: false});

    this.svc.initCheckoutData();
    this.svc.payload$
      .pipe(takeUntil(this.destroyed))
      .subscribe(p => {
        this.payload = p;
      });
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  hasCustomer(): boolean {
    return this.customerSer.hasAny();
  }

  onConfirm() {
    if ((window.history?.length || 0) > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  /** Thêm mới */
  addAddressModal(): void {
    this.openAddressModal();
  }

  /** Sửa địa chỉ hiện tại */
  editAddress(item: IAddress, ev?: MouseEvent): void {
    ev?.stopPropagation();
    this.openAddressModal(item);
  }

  // active address default
  onActiveAddress(item: IAddress) {
    if (!item.id) return;

    this.customerSer.setDefault(item.id);
    this.svc.setLocation(item.location)
  }

  /** Mở offcanvas dùng chung cho thêm/sửa */
  private openAddressModal(initial?: IAddress): void {
    const ref = this.offcanvas.open(CreateAddressModalComponent, {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      panelClass: 'offcanvas-bottom-sheet offcanvas-address'
    });

    (ref.componentInstance as CreateAddressModalComponent).initial = initial;

    ref.closed.pipe(takeUntil(this.destroyed))
      .subscribe((res: IAddress) => {
        if (!res) return;

        if (res.isDefault) {
          this.customerSer.setDefault(res.id);
        }

        this.svc.setCustomer({
          name: res.name,
          mobile: res.mobile,
          address: res.address,
          isDefault: res.isDefault
        });

        const loc = res.location;
        this.svc.setLocation(loc);
        this.svc.setLocationValue({
          cityId: Number(loc?.cityId || 0),
          districtId: Number(loc?.districtId || 0),
          wardId: Number(loc?.wardId || 0),
          cityName: loc?.cityName ?? '',
          districtName: loc?.districtName ?? '',
          wardName: loc?.wardName ?? ''
        });
      });
  }

  protected readonly fullAddress = fullAddress;
}
