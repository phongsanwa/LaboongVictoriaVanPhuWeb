import {ChangeDetectorRef, Component, OnInit, ViewEncapsulation} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {finalize} from 'rxjs';
import {NewsCategoryCacheService} from '@shared/services/global/news/news-cache.service';
import {IResNewsDetail} from '@shared/models/api';

@Component({
  selector: 'app-news-detail',
  templateUrl: './news-detail.component.html',
  styleUrls: [`./news-detail.component.scss`],
  standalone: false,
  encapsulation: ViewEncapsulation.None
})

export class NewsDetailComponent extends AppCommonComponent implements OnInit {
  newsDetail!: IResNewsDetail;
  id!: number
  constructor(
    private newsCacheService: NewsCategoryCacheService,
  ) {
    super();
    this.id = (this.navService.getParam('id') ?? '');
  }
  ngOnInit() {
    this.setHeader({
      variant: "title",
      show: true,
      back: true,
      title: "Chi tiết tin tức",
      className: "header-color",
    });

    this.setFooter({
      variant: "tabs",
      show: false,
    });

    this.spinner.show();
    this.newsCacheService.getNewsDetailOnce(this.id)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (detail) => {
          this.newsDetail = detail;
        }
      });
  }
}
