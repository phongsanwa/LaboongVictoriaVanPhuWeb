import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';
import {uriFeConst} from "@shared/constants";
type CodeMode = 'barcode';

@Component({
  selector: 'app-points',
  templateUrl: './points.component.html',
  styleUrls: ['./points.component.scss'],
  standalone: false,
})
export class PointsComponent extends AppCommonComponent implements OnInit {
  codeMode: CodeMode = 'barcode';
  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Điểm tích luỹ',
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });
  }

    protected readonly uriFeConst = uriFeConst;
}
