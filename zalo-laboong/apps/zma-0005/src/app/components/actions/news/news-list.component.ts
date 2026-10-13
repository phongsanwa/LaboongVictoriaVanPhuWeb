import { ChangeDetectorRef, Component, OnDestroy, OnInit } from "@angular/core";
import { Subject, takeUntil } from "rxjs";
import { NewsCategoryCacheService } from "@shared/services/global/news/news-cache.service";
import {uriFeConst} from '@shared/constants';
import {IResNewsList} from '@shared/models/api';

@Component({
  selector: "app-news-list",
  templateUrl: "./news-list.component.html",
  styleUrls: ["./news-list.component.scss"],
  standalone: false,
})
export class NewsListComponent implements OnInit, OnDestroy {
  newsList: IResNewsList[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private newsCacheService: NewsCategoryCacheService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.newsCacheService
      .getNewsOnce({ pageSize: 4 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.newsList = list?.map((item) => ({
            ...item,
            title: item.title ?? "Tin tức",
          })) ?? [];
          this.cd.markForCheck();
        },
        error: (err) => {
          console.error("Lỗi tải tin tức:", err);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected readonly uriFeConst = uriFeConst;
}
