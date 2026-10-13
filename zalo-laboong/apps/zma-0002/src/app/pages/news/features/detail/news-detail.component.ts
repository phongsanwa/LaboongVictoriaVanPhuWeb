import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {finalize} from 'rxjs';
import {NewsCategoryCacheService} from '@shared/services/global/news/news-cache.service';
import {IResNewsDetail} from '@shared/models/api';


@Component({
  selector: 'app-news-detail',
  templateUrl: './news-detail.component.html',
  styleUrls: [`./news-detail.component.scss`],
  standalone: false
})

export class NewsDetailComponent extends AppCommonComponent implements OnInit {
  newsDetail!: IResNewsDetail;
  idNews!: number;
  isLoading = false;
  constructor(
    private cd: ChangeDetectorRef,
    private newsCacheService: NewsCategoryCacheService,
  ) {
    super();
    this.idNews = (this.navService.getParam('id') ?? '');
  }
  ngOnInit() {
    this.setHeader({
      variant: "title",
      show: false,
      back: true,
      title: "Chi tiết tin tức",
      className: "header-color",
    });

    this.setFooter({
      variant: "tabs",
      show: false,
    });

    const id = this.idNews;

    this.isLoading = true;

    this.newsCacheService.getNewsDetailOnce(id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (detail) => {
          this.newsDetail = detail;
        },
        error: () => {
          // this.errorMessage = 'Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.';
        }
      });


    this.cd.markForCheck();
  }

  goBack(): void {
    this.headerFooterFacade.back();
  }
}
