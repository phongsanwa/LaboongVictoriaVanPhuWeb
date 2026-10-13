import {Component, OnInit} from '@angular/core';
import {NavTabItem} from '@shared/components/app-nav-tabs/app-nav-tab.component';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';


export type VoucherTabKey =
  | 'VOUCHER_STILL_VALID'
  | 'VOUCHER_USED'
  | 'VOUCHER_EXPIRED'
  | 'VOUCHER_GIVE';

@Component({
  selector: 'app-voucher',
  standalone: false,
  templateUrl: './voucher.component.html',
  styleUrls: ['./voucher.component.scss'],
})



export class VoucherComponent extends AppCommonComponent implements OnInit {
  tabs: NavTabItem[] = [];
  activeTab: VoucherTabKey = 'VOUCHER_STILL_VALID';


  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Ưu đãi',
    });
    this.setFooter({variant: 'tabs', show: false});

    this.tabs = [
      {key: 'VOUCHER_STILL_VALID', label: 'Còn hiệu lực'},
      {key: 'VOUCHER_USED', label: 'Đã sử dụng'},
      {key: 'VOUCHER_EXPIRED', label: 'Đã hết hạn'},
      {key: 'VOUCHER_GIVE', label: 'Đã tặng'}
    ];
  }

  onActiveChange(key: string) {

  }

  protected readonly uriFeConst = uriFeConst;
}
