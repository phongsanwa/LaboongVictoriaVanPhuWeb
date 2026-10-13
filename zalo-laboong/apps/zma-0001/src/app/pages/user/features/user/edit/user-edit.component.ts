import {Component, inject, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {UserService} from '@core/services';
import {IResUserInfo} from '@core/models/zmp.model';

@Component({
  selector: 'app-user-edit',
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.scss'],
  standalone: false
})

export class UserEditComponent extends AppCommonComponent implements OnInit {
  userInfo!: IResUserInfo;

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Cá nhân'});
    this.setFooter({variant: 'tabs', show: false});

    this.userInfo = this.appService.getUserInfo ? this.appService.getUserInfo : {
      id: '',
      idByOA: '',
      name: '',
      avatar: '',
      phoneNumber: '',
      followedOA: false,
      isSensitive: false,
    }
  }
}
