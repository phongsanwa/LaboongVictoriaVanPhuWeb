import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '../../../../../../../../common/shared/components/app-common.service';

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: [`./membership.component.scss`],
  standalone: false
})


export class MembershipComponent extends AppCommonComponent implements OnInit {

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Lịch sử điểm tích luỹ'});
    this.setFooter({variant: 'tabs', show: false});
  }
}
