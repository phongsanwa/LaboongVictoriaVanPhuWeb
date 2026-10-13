import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {IResUserInfo} from '@core/models/zmp.model';
import {takeUntil} from 'rxjs';
import {IResStatusTrackingOrder} from '@shared/models/api';
import {OrderApiService} from '@shared/services/api/order/order-api.service';
import {minimizeApp, openChat} from 'zmp-sdk/apis';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: [`./user.component.scss`],
  standalone: false
})

export class UserComponent extends AppCommonComponent implements OnInit {
  userInfo!: IResUserInfo;
  orderStatusData: IResStatusTrackingOrder[] = [];
  constructor(
    private orderApi: OrderApiService,
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
    this.setHeader({variant: 'title', show: true, back: true, title: 'Tài khoản'});
    this.setFooter({variant: 'tabs', show: false});

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
  }


  minimizeOpenChat() {
    minimizeApp()
      .then(() => {
        openChat({type: 'user', id: '900441440596624596', message: 'Xin chào'});
      })
      .catch((err) => {
        console.error('Lỗi khi thu nhỏ hoặc mở chat:', err);
      });
  }



  protected readonly uriFeConst = uriFeConst;
}
