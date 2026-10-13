import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';

interface MemberTab {
  id: string;
  label: string;
  bgClass: string;
  color: string;
}
@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  standalone: false,
})
export class MembershipComponent extends AppCommonComponent implements OnInit {
  memberTabs: MemberTab[] = [
    { id: 'new', label: 'Thành viên', bgClass: 'bg-new', color: '#22c58b' },
    { id: 'silver', label: 'Hạng Bạc', bgClass: 'bg-silver', color: '#adb5bd' },
    { id: 'gold', label: 'Hạng Vàng', bgClass: 'bg-gold', color: '#f9c74f' },
    { id: 'ruby', label: 'Hạng Ruby', bgClass: 'bg-ruby', color: '#be4bdb' },
  ];

  selectedTab = 'new';
  selectedColor = this.memberTabs[0].color;

  user = {
    name: 'Tunglx',
    phone: '0901234567',
    level: 'Thành viên Mới',
    points: 0
  };

  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Hạng thành viên',
      className: 'header-color',
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    const found = this.memberTabs.find(t => t.id === tabId);
    if (found) this.selectedColor = found.color;
  }

  protected readonly uriFeConst = uriFeConst;
}
