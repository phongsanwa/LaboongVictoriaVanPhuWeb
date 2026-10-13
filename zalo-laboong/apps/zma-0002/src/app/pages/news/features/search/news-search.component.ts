import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {uriFeConst} from '@shared/constants';
import {IResGetCategoryNews, IResNewsList, ISearchNewsListParam} from '@shared/models/api';
import {NewsCategoryCacheService} from '@shared/services/global/news/news-cache.service';
import {debounceTime, distinctUntilChanged, finalize, Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-news-search',
  templateUrl: './news-search.component.html',
  styleUrls: ['./news-search.component.scss'],
  standalone: false,
})
export class NewsSearchComponent extends AppCommonComponent implements OnInit {
  categories: IResGetCategoryNews[] = [];
  news: IResNewsList[] = [];
  keyword = '';
  isLoading = false;
  readonly skeletonItems = [1, 2, 3];

  private search$ = new Subject<string>();
  private searchRequestId = 0;

  constructor(
    private newsCache: NewsCategoryCacheService,
    private route: ActivatedRoute,
  ) {
    super();
  }

  ngOnInit(): void {
    this.setHeader({
      variant: 'title',
      show: false,
      back: true,
      title: 'Tìm kiếm tin tức',
      className: 'header-color',
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });

    this.newsCache.getNewsCategoriesOnce()
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: categories => this.categories = categories ?? [],
        error: () => this.categories = [],
      });

    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroyed))
      .subscribe(keyword => this.searchNews(keyword));

    this.route.queryParams.pipe(takeUntil(this.destroyed)).subscribe(params => {
      const q = String(params['q'] || '').trim();
      if (!q) return;
      this.keyword = q;
      this.searchNews(q);
    });
  }

  onKeywordChange(event: Event): void {
    this.keyword = (event.target as HTMLInputElement).value;
    this.search$.next(this.keyword);
  }

  selectCategory(category: IResGetCategoryNews): void {
    this.navService.redirect([uriFeConst.news.index], {
      queryParams: {categoryId: category.id},
    });
  }

  goHome(): void {
    this.navService.redirect([uriFeConst.home]);
  }

  private searchNews(keyword: string): void {
    const trimmedKeyword = keyword.trim();
    const requestId = ++this.searchRequestId;

    if (!trimmedKeyword) {
      this.news = [];
      this.isLoading = false;
      return;
    }

    const params: ISearchNewsListParam = {
      pageSize: 100,
      status: 1,
      keyword: trimmedKeyword,
    };

    this.isLoading = true;
    this.newsCache.getNewsOnce(params)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          if (requestId === this.searchRequestId) {
            this.isLoading = false;
          }
        })
      )
      .subscribe({
        next: news => {
          if (requestId !== this.searchRequestId) return;
          this.news = news ?? [];
        },
        error: () => {
          if (requestId !== this.searchRequestId) return;
          this.news = [];
        },
      });
  }

  get isSearching(): boolean {
    return !!this.keyword.trim();
  }

  get resultTitle(): string {
    return `Kết quả (${this.news.length})`;
  }

  protected readonly uriFeConst = uriFeConst;
}
