import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {CheckoutManageService, CustomerManageService} from '@shared/services/global';
import {fullAddress} from '@shared/utils';
import {IAddress} from '@shared/models/global';
import {Router} from '@angular/router';
import {uriFeConst} from '@shared/constants';


@Component({
  selector: 'app-address-index',
  templateUrl: './address-index.component.html',
  styleUrls: [`./address-index.component.scss`],
  standalone: false
})

export class AddressIndexComponent extends AppCommonComponent implements OnInit {
  constructor(
    public customerSer: CustomerManageService,
    private svc: CheckoutManageService,
    private router: Router,
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Địa chỉ nhận hàng'});
    this.setFooter({variant: 'tabs', show: false});
  }

  hasCustomer(): boolean {
    return this.customerSer.hasAny();
  }


  //check if else các trường hợp đang ở trang nào khi thêm địa chỉ thì lưu xong back lại trang đó
  onActiveAddress(item: IAddress) {
    if (!item.id) return;
    this.customerSer.setDefault(item.id);
    this.svc.setLocation(item.location);
    const from = history.state?.from || sessionStorage.getItem('addressFrom');
    if (from === '/checkout') {
      sessionStorage.removeItem('addressFrom');
      this.router.navigate(['/checkout']);
    } else {
      this.router.navigate(['/user/profile']);
    }
  }

  onRemoveAddress(item: IAddress) {
    if (!item.id) return;
    const confirmDelete = confirm(`Bạn có chắc muốn xoá địa chỉ của "${item.name}" không?`);
    if (!confirmDelete) return;
    this.customerSer.remove(item.id);
  }


  protected readonly fullAddress = fullAddress;
  protected readonly uriFeConst = uriFeConst;
}
