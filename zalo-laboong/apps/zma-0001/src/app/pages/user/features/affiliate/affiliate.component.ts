import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';

@Component({
  selector: 'app-affiliate',
  template: `
    <div class="p-3">
      <p class="alert alert-info">
        Tính năng sắp ra mắt
      </p>
    </div>
  `,
  standalone: false
})

export class AffiliateComponent extends AppCommonComponent implements OnInit {


  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Affiliate Marketing'});
    this.setFooter({variant: 'tabs', show: true});

  }
}
