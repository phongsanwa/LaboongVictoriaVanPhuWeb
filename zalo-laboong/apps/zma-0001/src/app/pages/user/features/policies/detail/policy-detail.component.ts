import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AppCommonComponent } from '@shared/components/app-common.service';
import { IResArticleByType } from '@shared/models/api';
import { NewsCategoryCacheService } from '@shared/services/global/news/news-cache.service';
import { POLICY_LIST } from '@core/constants';

@Component({
  selector: 'app-policy-detail',
  templateUrl: './policy-detail.component.html',
  standalone: false
})
export class PolicyDetailComponent extends AppCommonComponent implements OnInit {
  articleDetail!: IResArticleByType;
  isLoading = true;
  type!: number;
  constructor(
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private newsCacheService: NewsCategoryCacheService,
  ) {
    super();
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const policy = POLICY_LIST.find(item => item.slug === slug);
    if (!policy) {
      return;
    }
    this.type = policy.type;
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: policy.title,
      className: 'header-color',
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });
    this.spinner.show();
    this.newsCacheService.getArticleByTypeOnce({
      type: this.type
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.spinner.hide();
        })
      )
      .subscribe({
        next: (detail) => {
          this.articleDetail = detail;
          this.cd.markForCheck();
        },
        error: () => {
          this.notifyService.error('Có lỗi xảy ra');
        }
      });
  }
}
