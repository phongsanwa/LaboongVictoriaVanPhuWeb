import { Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {POLICY_LIST} from '@core/constants';
import {uriFeConst} from '@shared/constants';

@Component({
  selector: 'app-article-by-type-detail',
  templateUrl: './term-policy.component.html',
  standalone: false
})

export class TermPolicyListComponent extends AppCommonComponent implements OnInit {
  policyList = POLICY_LIST;
  type!: number | null;
  constructor() {
    super();
    const typeParam = Number(this.navService.getParam('type'));
    this.type = Number.isFinite(typeParam) ? typeParam : null;
  }

  ngOnInit(): void {
    this.setHeader({
      variant: "title",
      show: true,
      back: true,
      title: 'Điều khoản và chính sách',
      className: "header-color",
    });
    this.setFooter({
      variant: "tabs",
      show: false,
    });
  }

  protected readonly uriFeConst = uriFeConst;
}
