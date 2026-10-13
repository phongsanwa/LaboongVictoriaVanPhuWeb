import {Component, OnInit} from '@angular/core';
import {IResUserInfo} from '@core/models/zmp.model';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {environment} from '../../../../../../environments';

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.scss'],
  standalone: false,
})
export class UserEditComponent extends AppCommonComponent implements OnInit {
  userInfo!: IResUserInfo;
  name = '';
  phone = '';
  email = '';
  birthday = '';
  gender: 'male' | 'female' = 'female';
  showEmailError = false;

  ngOnInit(): void {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Thông tin tài khoản'});
    this.setFooter({variant: 'tabs', show: false});

    this.userInfo = this.appService.getUserInfo || {
      id: '',
      idByOA: '',
      name: '',
      avatar: '',
      phoneNumber: '',
      followedOA: false,
      isSensitive: false,
    };
    this.name = this.userInfo.name || (this.showTemplateFallbacks ? 'Đặng Mỹ Huyền' : '');
    this.phone = this.userInfo.phoneNumber || (this.showTemplateFallbacks ? '0912345678' : '');
  }

  onSave(): void {
    this.showEmailError = !!this.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
    if (this.showEmailError) return;
    this.notifyService.success('Đã lưu thay đổi');
  }

  get showTemplateFallbacks(): boolean {
    return !!environment.showTemplateFallbacks;
  }
}
