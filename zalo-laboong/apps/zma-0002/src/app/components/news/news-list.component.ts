import { ChangeDetectorRef, Component, OnDestroy, OnInit, signal } from "@angular/core";
import { forkJoin, of, Subject, takeUntil } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";
import { NewsCategoryCacheService } from "@shared/services/global/news/news-cache.service";
import { uriFeConst } from '@shared/constants';
import { IResGetCategoryNews, IResNewsList } from '@shared/models/api';
import {environment} from '../../../environments';

interface NewsCard {
  id: number | string;
  title: string;
  avatarUri: string;
  publishedDate: string;
  hits: number;
  categoryId?: number;
}

interface NewsCategoryBlock {
  id: number | string;
  name: string;
  items: NewsCard[];
}

@Component({
  selector: "app-news-list",
  templateUrl: "./news-list.component.html",
  styleUrls: ["./news-list.component.scss"],
  standalone: false,
})
export class NewsListComponent implements OnInit, OnDestroy {
  private readonly homeCategoryNewsLimits = [4, 2];
  newsList: IResNewsList[] = [];
  categories: IResGetCategoryNews[] = [];
  categoryBlocks: NewsCategoryBlock[] = [];
  readonly fallbackNews: NewsCard[] = [
    {
      id: 'fixed-news-1',
      title: '" GỌI HÈ 2024 VỀ " cùng chúng tôi',
      avatarUri: 'https://www.figma.com/api/mcp/asset/95d0a959-a40e-4b32-bf36-fcf2308c864e',
      publishedDate: '2024-03-21',
      hits: 3840,
    },
    {
      id: 'fixed-news-2',
      title: 'TẾT CÁC ANH ĐỊNH MẶC GÌ?',
      avatarUri: 'https://www.figma.com/api/mcp/asset/5044e568-7b31-48fb-b175-0fe7ae37edae',
      publishedDate: '2024-01-03',
      hits: 3840,
    },
    {
      id: 'fixed-news-3',
      title: '"XẢ ĐỒNG GIÁ SẢN PHẨM LẺ SIZE"',
      avatarUri: 'https://www.figma.com/api/mcp/asset/8df5a148-31b4-4a79-8d45-0b0ddea2d831',
      publishedDate: '2023-12-21',
      hits: 3840,
    },
    {
      id: 'fixed-news-4',
      title: 'ƯU ĐÃI dành riêng cho tất cả khách hàng',
      avatarUri: 'https://www.figma.com/api/mcp/asset/0e00fed9-5950-4669-a320-08ac4d59480e',
      publishedDate: '2023-10-25',
      hits: 3840,
    },
  ];
  isLoading = signal(true);
  readonly skeletonItems = [1, 2];

  private destroy$ = new Subject<void>();

  constructor(
    private newsCacheService: NewsCategoryCacheService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.newsCacheService.getNewsCategoriesOnce()
      .pipe(takeUntil(this.destroy$))
      .pipe(
        switchMap(categories => {
          this.categories = categories ?? [];
          if (!this.categories.length) {
            return this.newsCacheService.getNewsOnce({pageSize: 12, status: 1}).pipe(
              map(news => this.buildCategoryBlocksFromNews(news ?? []))
            );
          }

          const homeCategories = this.categories.slice(0, this.homeCategoryNewsLimits.length);
          const requests = homeCategories.map((category, index) =>
            this.newsCacheService
              .getNewsOnce({
                pageSize: this.homeCategoryNewsLimits[index],
                status: 1,
                categoryId: category.id,
              })
              .pipe(
                map(news => ({
                  id: category.id,
                  name: category.name,
                  items: (news ?? [])
                    .slice(0, this.homeCategoryNewsLimits[index])
                    .map(item => this.toNewsCard(item)),
                })),
                catchError(() => of({
                  id: category.id,
                  name: category.name,
                  items: [],
                }))
              )
          );

          return forkJoin(requests).pipe(
            map(blocks => blocks.filter(block => block.items.length > 0))
          );
        })
      )
      .subscribe({
        next: (blocks) => {
          this.categoryBlocks = blocks.length
            ? blocks
            : this.buildCategoryBlocksFromNews([]);
          this.isLoading.set(false);
          this.cd.markForCheck();
        },
        error: () => {
          this.categoryBlocks = this.buildCategoryBlocksFromNews([]);
          this.isLoading.set(false);
          this.cd.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get displayNews(): NewsCard[] {
    if (!this.newsList?.length) {
      return this.showTemplateFallbacks ? this.fallbackNews : [];
    }

    return this.newsList.slice(0, 4).map(item => this.toNewsCard(item));
  }

  private buildCategoryBlocksFromNews(news: IResNewsList[]): NewsCategoryBlock[] {
    this.newsList = news;
    if (!this.newsList?.length) {
      return this.showTemplateFallbacks ? [{
        id: 'fallback-news',
        name: 'Tin tức',
        items: this.fallbackNews,
      }] : [];
    }

    const sourceCategories = this.categories?.length
      ? this.categories
      : Array.from(
        new Map(
          this.newsList
            .filter(item => item.category?.id)
            .map(item => [item.category.id, item.category])
        ).values()
      ) as IResGetCategoryNews[];

    const blocks = sourceCategories
      .slice(0, this.homeCategoryNewsLimits.length)
      .map((category, index) => {
        const items = this.newsList
          .filter(item => item.category?.id === category.id)
          .slice(0, this.homeCategoryNewsLimits[index])
          .map(item => this.toNewsCard(item));

        return {
          id: category.id,
          name: category.name,
          items,
        };
      })
      .filter(block => block.items.length > 0);

    return blocks.length
      ? blocks
      : [{
        id: 'all-news',
        name: 'Tin tức',
        items: this.displayNews,
      }];
  }

  isApiNews(item: NewsCard): boolean {
    return typeof item.id === 'number';
  }

  isCategoryBlock(block: NewsCategoryBlock): boolean {
    return typeof block.id === 'number';
  }

  private toNewsCard(item: IResNewsList): NewsCard {
    return {
      id: item.id,
      title: item.title,
      avatarUri: item.avatarUri || 'assets/img/no-image.png',
      publishedDate: item.publishedDate || '',
      hits: item.hits ?? 0,
      categoryId: item.category?.id,
    };
  }

  get showTemplateFallbacks(): boolean {
    return !!environment.showTemplateFallbacks;
  }

  protected readonly uriFeConst = uriFeConst;
}
