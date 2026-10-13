import { Component, OnInit } from "@angular/core";
import {AppCommonComponent} from '@shared/components/app-common.service';
import {IResGetCategoryNews, IResNewsList, ISearchNewsListParam} from '@shared/models/api';
import {NewsCategoryCacheService} from '@shared/services/global/news/news-cache.service';
import {finalize, forkJoin, of, takeUntil} from 'rxjs';
import {uriFeConst} from '@shared/constants';
import {ActivatedRoute, Router} from '@angular/router';

interface NewsSection {
  category: IResGetCategoryNews;
  news: IResNewsList[];
}

@Component({
  selector: "app-news",
  templateUrl: "./news.component.html",
  styleUrls: ["./news.component.scss"],
  standalone: false,
})
export class NewsComponent extends AppCommonComponent implements OnInit {
  allNews: IResNewsList[] = [];
  categories: IResGetCategoryNews[] = [];
  newsSections: NewsSection[] = [];
  selectedCategoryId: number | null = null;
  searchText = '';
  isLoading = true;
  readonly skeletonItems = [1, 2, 3, 4];
  private newsRequestId = 0;
  readonly isCategoryListPage: boolean;

  constructor(
    private newsCache: NewsCategoryCacheService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    super();
    this.isCategoryListPage = this.route.snapshot.routeConfig?.path === 'category';
  }

  ngOnInit() {
    this.newsCache.clearCache();
    const categoryId = Number(this.route.snapshot.queryParamMap.get('categoryId'));
    this.selectedCategoryId = Number.isFinite(categoryId) && categoryId > 0 ? categoryId : null;

    this.setHeader({
      variant: 'title',
      show: false,
      back: true,
      title: 'Tin tức',
      className: 'header-color'
    });

    this.setFooter({
      variant: 'tabs',
      show: false,
    });

    this.newsCache.getNewsCategoriesOnce()
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: categories => {
          this.categories = categories ?? [];
          if (this.isCategoryListPage) {
            this.loadNewsByCategory(this.selectedCategoryId);
          } else {
            this.loadNewsOverview(this.selectedCategoryId);
          }
        },
        error: () => {
          this.categories = [];
          if (this.isCategoryListPage) {
            this.loadNewsByCategory(this.selectedCategoryId);
          } else {
            this.loadNewsOverview(this.selectedCategoryId);
          }
        }
      });

  }

  private loadNewsOverview(categoryId: number | null = null): void {
    const requestId = ++this.newsRequestId;
    this.selectedCategoryId = categoryId;
    this.isLoading = true;
    this.allNews = [];

    if (!this.categories.length) {
      this.newsCache.getNewsOnce({pageSize: 100, status: 1})
        .pipe(
          takeUntil(this.destroyed),
          finalize(() => {
            if (requestId === this.newsRequestId) {
              this.isLoading = false;
            }
          })
        )
        .subscribe({
          next: news => {
            if (requestId !== this.newsRequestId) return;
            this.allNews = news ?? [];
            this.newsSections = [];
          },
          error: () => {
            if (requestId !== this.newsRequestId) return;
            this.allNews = [];
            this.newsSections = [];
          }
        });
      return;
    }

    const sectionCategories = categoryId
      ? this.categories.filter(category => category.id === categoryId)
      : this.categories;

    const sectionRequests = sectionCategories.map(category =>
      this.newsCache.getNewsOnce({
        pageSize: 4,
        status: 1,
        categoryId: category.id,
      })
    );

    forkJoin(sectionRequests.length ? sectionRequests : [of([] as IResNewsList[])])
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          if (requestId === this.newsRequestId) {
            this.isLoading = false;
          }
        })
      )
      .subscribe({
        next: results => {
          if (requestId !== this.newsRequestId) return;
          this.newsSections = sectionCategories
            .map((category, index) => ({
              category,
              news: results[index] ?? [],
            }))
            .filter(section => section.news.length);
        },
        error: () => {
          if (requestId !== this.newsRequestId) return;
          this.newsSections = [];
        }
      });
  }

  private loadNewsByCategory(categoryId: number | null): void {
    const requestId = ++this.newsRequestId;
    const params: ISearchNewsListParam = {
      pageSize: 100,
      status: 1,
      ...(categoryId ? {categoryId} : {}),
    };

    this.isLoading = true;
    this.newsSections = [];
    this.newsCache.getNewsOnce(params)
      .pipe(
        takeUntil(this.destroyed),
        finalize(() => {
          if (requestId === this.newsRequestId) {
            this.isLoading = false;
          }
        })
      )
      .subscribe({
        next: news => {
          if (requestId !== this.newsRequestId) return;
          this.allNews = news ?? [];
        },
        error: () => {
          if (requestId !== this.newsRequestId) return;
          this.allNews = [];
        }
      });
  }

  get filteredNews(): IResNewsList[] {
    const keyword = this.searchText.trim().toLowerCase();
    return this.allNews.filter(item => {
      const matchesSearch = !keyword
        || item.title?.toLowerCase().includes(keyword)
        || item.description?.toLowerCase().includes(keyword)
        || item.category?.name?.toLowerCase().includes(keyword);
      return matchesSearch;
    });
  }

  get filteredSections(): NewsSection[] {
    const keyword = this.searchText.trim().toLowerCase();
    if (!keyword) return this.newsSections;

    return this.newsSections
      .map(section => ({
        ...section,
        news: section.news.filter(item => this.newsMatchesKeyword(item, keyword)),
      }))
      .filter(section => section.news.length);
  }

  get selectedCategoryName(): string {
    return this.categories.find(item => item.id === this.selectedCategoryId)?.name || 'Tin tức';
  }

  selectCategory(categoryId: number | null): void {
    if (this.selectedCategoryId === categoryId) return;
    this.selectedCategoryId = categoryId;
    this.loadNewsOverview(categoryId);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {categoryId: categoryId || null},
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openCategoryList(categoryId: number): void {
    this.router.navigate([uriFeConst.news.category], {
      queryParams: {categoryId},
    });
  }

  onSearch(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
  }

  openSearch(): void {
    this.router.navigate([uriFeConst.news.search]);
  }

  goHome(): void {
    this.navService.redirect([uriFeConst.home]);
  }

  goBack(): void {
    if (this.isCategoryListPage) {
      this.router.navigate([uriFeConst.news.index]);
      return;
    }
    if (this.selectedCategoryId !== null) {
      this.selectCategory(null);
      return;
    }
    this.headerFooterFacade.back();
  }

  private newsMatchesKeyword(item: IResNewsList, keyword: string): boolean {
    return !keyword
      || item.title?.toLowerCase().includes(keyword)
      || item.description?.toLowerCase().includes(keyword)
      || item.category?.name?.toLowerCase().includes(keyword);
  }

  protected readonly uriFeConst = uriFeConst;
}
