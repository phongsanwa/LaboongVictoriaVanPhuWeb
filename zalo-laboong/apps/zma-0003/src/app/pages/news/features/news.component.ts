import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';
import { NewsCategoryCacheService } from '@shared/services/global/news/news-cache.service';
import { NavTabItem } from '@shared/components/app-nav-tabs/app-nav-tab.component';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import {uriFeConst} from "@shared/constants";
import {IResGetCategoryNews, IResNewsList} from '@shared/models/api';

@Component({
  selector: 'app-news',
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.scss'],
  standalone: false
})
export class NewsComponent extends AppCommonComponent implements OnInit {
  tabs: NavTabItem[] = [];
  activeTab: string = 'all';

  allNews: IResNewsList[] = [];
  filteredNews: IResNewsList[] = [];
  categories: IResGetCategoryNews[] = [];

  constructor(private newsCache: NewsCategoryCacheService) {
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

    combineLatest([
      this.newsCache.getNewsCategoriesOnce(),
      this.newsCache.getNewsOnce({ pageSize: 100 }),
    ])
      .pipe(map(([categories, news]) => ({ categories, news })))
      .subscribe(({ categories, news }) => {
        this.categories = categories ?? [];
        this.allNews = news ?? [];

        this.tabs = [
          { key: 'all', label: 'Tất cả' },
          ...this.categories.map(c => ({ key: String(c.id), label: c.name })),
        ];

        this.filterNews();
      });
  }

  onTabChange(key: string): void {
    this.activeTab = key;
    this.filterNews();
  }

  filterNews(): void {
    if (this.activeTab === 'all') {
      this.filteredNews = this.allNews;
    } else {
      const categoryId = Number(this.activeTab);
      this.filteredNews = this.allNews.filter(news => news.category?.id === categoryId);
    }
  }
  protected readonly uriFeConst = uriFeConst;
}
