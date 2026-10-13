import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';


@Component({
  selector: 'app-points',
  templateUrl: './points.component.html',
  styleUrls: ['./points.component.scss'],
  standalone: false,
})
export class PointsComponent extends AppCommonComponent implements OnInit {

  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Tích điểm',
      className: 'header-color',
    });

    this.setFooter({
      variant: 'tabs',
      show: true,
    });
  }
}
