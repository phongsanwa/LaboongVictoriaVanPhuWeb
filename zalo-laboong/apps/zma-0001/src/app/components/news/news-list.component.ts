import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {takeUntil} from 'rxjs';
import {NewsCategoryCacheService} from '@shared/services/global/news/news-cache.service';
import {uriFeConst} from '@shared/constants';
import {IResNewsList} from '@shared/models/api';
import {AppCommonComponent} from '@shared/components/app-common.service';

@Component({
  selector: 'app-news-list',
  templateUrl: './news-list.component.html',
  styleUrls: [`news-list.component.scss`],
  standalone: false
})

export class NewsListComponent extends AppCommonComponent implements OnInit, OnDestroy {
  newsList: IResNewsList[] = []

  constructor(
    private newsCacheService: NewsCategoryCacheService,
    private cd: ChangeDetectorRef,
  ) {
    super();
  }

  ngOnInit() {
    this.newsCacheService.getNewsOnce({ pageSize: 4, status: 1})
      .pipe(takeUntil(this.destroyed))
      .subscribe(list => {
        this.newsList = list ?? [];
        this.cd.markForCheck();
      });
  }

  ngOnDestroy() {
    this.getDestroySubs();
  }

  protected readonly uriFeConst = uriFeConst;
}
