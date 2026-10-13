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
  private readonly usrService = inject(UserService);
  userInfo: IResUserInfo | null = null;


  async ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Chỉnh sửa thông tin'});
    this.setFooter({variant: 'tabs', show: false});

    const userJson = await this.usrService.getDataUser();
    if (userJson) {
      this.userInfo = JSON.parse(userJson);
    }
  }


}
