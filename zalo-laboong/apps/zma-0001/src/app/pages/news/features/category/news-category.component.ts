import {Component, OnInit} from '@angular/core';
import {finalize, forkJoin} from 'rxjs';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {NewsCategoryCacheService} from '@shared/services/global/news/news-cache.service';
import {NavTabItem} from '@shared/components/app-nav-tabs/app-nav-tab.component';
import {uriFeConst} from '@shared/constants';
import {IResGetCategoryNews, IResNewsList, ISearchNewsListParam} from '@shared/models/api';

@Component({
  selector: 'app-news-category',
  templateUrl: './news-category.component.html',
  styleUrls: [`./news-category.component.scss`],
  standalone: false
})

export class NewsCategoryComponent extends AppCommonComponent implements OnInit {
  tabs: NavTabItem[] = [];
  activeTab: string = 'all';

  allNews: IResNewsList[] = [];
  filteredNews: IResNewsList[] = [];
  categories: IResGetCategoryNews[] = [];
  private newsRequestId = 0;

  constructor(
    private newsCache: NewsCategoryCacheService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.newsCache.clearCache();
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Tin tức',
      className: 'header-color'
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });

    this.spinner.show();
    forkJoin({
      categories: this.newsCache.getNewsCategoriesOnce(),
      news: this.newsCache.getNewsOnce({ pageSize: 100, status: 1}),
    }).pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: ({categories, news}) => {
          this.categories = categories ?? [];
          this.allNews = news ?? [];
          this.tabs = [
            {key: 'all', label: 'Tất cả'},
            ...this.categories.map(c => ({key: String(c.id), label: c.name})),
          ];
          this.filteredNews = this.allNews;
        },
        error: () => {
          this.categories = [];
          this.allNews = [];
          this.filteredNews = [];
          this.tabs = [{key: 'all', label: 'Tất cả'}];
        }
      });
  }

  onTabChange(key: string): void {
    if (this.activeTab === key) return;
    this.activeTab = key;
    this.loadNewsByCategory(key === 'all' ? null : Number(key));
  }

  private loadNewsByCategory(categoryId: number | null): void {
    const requestId = ++this.newsRequestId;
    const params: ISearchNewsListParam = {
      pageSize: 100,
      status: 1,
      ...(categoryId ? {categoryId} : {}),
    };

    this.spinner.show();
    this.newsCache.getNewsOnce(params)
      .pipe(finalize(() => {
        if (requestId === this.newsRequestId) {
          this.spinner.hide();
        }
      }))
      .subscribe({
        next: news => {
          if (requestId !== this.newsRequestId) return;
          this.allNews = news ?? [];
          this.filteredNews = this.allNews;
        },
        error: () => {
          if (requestId !== this.newsRequestId) return;
          this.allNews = [];
          this.filteredNews = [];
        }
      });
  }

  protected readonly uriFeConst = uriFeConst;
}
