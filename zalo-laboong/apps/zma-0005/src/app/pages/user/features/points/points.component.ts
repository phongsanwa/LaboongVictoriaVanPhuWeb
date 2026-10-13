import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';

interface PointTab {
  id: string;
  label: string;
}
@Component({
  selector: 'app-points',
  templateUrl: './points.component.html',
  styleUrls: ['./points.component.scss'],
  standalone: false,
})
export class PointsComponent extends AppCommonComponent implements OnInit {
  pointTabs: PointTab[] = [
    { id: 'history', label: 'Lịch sử' },
    { id: 'information', label: 'Thông tin' },
  ];
  selectedTab = 'history';
  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Ví điểm',
      className: 'header-color',
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });
  }

  selectTab(tabId: string) {
    this.selectedTab = tabId;
    const found = this.pointTabs.find(t => t.id === tabId);
  }
}
