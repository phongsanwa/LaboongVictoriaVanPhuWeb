import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewEncapsulation
} from '@angular/core';
import {CommonModule, NgTemplateOutlet} from '@angular/common';
import {RouterLink} from '@angular/router';
import {Autoplay, Navigation, Pagination} from 'swiper/modules';

export type SlideItem = {
  image?: string;
  title?: string;
  name?: string;
  href?: string;
  routerLink?: string | any[];
  queryParams?: Record<string, any>;
  [key: string]: any;
  // images: {
  //   avatar: string,
  // }
}

export interface SlideConfig {
  showNavigation?: boolean;
  showPagination?: boolean;
  slidesPerView?: number;
  spaceBetween?: number;
  autoplay?: boolean;
  autoplayDelay?: number; // ms
  loop?: boolean;
  breakpoints?: Record<string | number, any>;
  className?: string;
  showName?: boolean;
}

@Component({
  selector: 'app-universal-slide',
  standalone: true,
  imports: [CommonModule, RouterLink, NgTemplateOutlet],
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .rounded-lg {
      border-radius: .5rem;
    }

    .swiper {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .swiper-wrapper {
      display: flex;
      width: 100%;
      height: 100%;
    }

    .swiper-slide {
      flex-shrink: 0;
      height: 100%;
      width: 100%;
    }

    .swiper-slide .d-block {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      flex-grow: 1;
      border-radius: .5rem;
      aspect-ratio: 19 / 9;
    }

    .swiper-slide .d-block span {
      flex-shrink: 0;
      height: auto;
    }
  `],
  template: `
    <div class="swiper mySwiper-{{uniqueId}}">
      <div class="swiper-wrapper">
        @if (items && items.length) {
          @for (item of items; track trackByFn($index, item)) {
            <div class="swiper-slide">
              <!-- Custom item template from parent -->
              <ng-container
                [ngTemplateOutlet]="itemTpl ?? defaultItem"
                [ngTemplateOutletContext]="{$implicit: item, index: $index}">
              </ng-container>
            </div>
          }
        } @else {
          <div class="swiper-slide">
            <a class="text-center d-block">
              <img src="assets/img/no-image.png" alt="" class="w-100 rounded-lg"/>
            </a>
          </div>
        }
      </div>

      @if (config && config.showPagination) {
        <div class="swiper-pagination"></div>
      }
      @if (config && config.showNavigation) {
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
      }
    </div>

    <ng-template #defaultItem let-item let-i="index">
      @if (item && item.routerLink) {
        <a [class]="(config.className || 'text-center') + ' d-block'" [routerLink]="item.routerLink"
           [queryParams]="item.queryParams">
          <img [src]="item.image || item.images?.avatar || 'assets/img/no-image.png'" [alt]="item.title || ''" class="w-100 rounded-lg"/>
          @if (item.name && config.showName !== false) {
            <span class="mt-2 text-sm font-medium">{{ item.name }}
            </span>
          }
        </a>
      } @else {
        <a [class]="(config.className || 'text-center') + ' d-block'" [href]="item.href || 'javascript:void(0)'"
           target="_self">
          <img [src]="item.image || item.images?.avatar || 'assets/img/no-image.png'" [alt]="item.title || ''" class="w-100 rounded-lg"/>
          @if (item.name && config.showName !== false) {
            <span class="mt-2 text-sm font-medium">{{ item.name }}
            </span>
          }
        </a>
      }
    </ng-template>
  `,
})
export class UniversalSlideComponent implements OnInit, OnDestroy, OnChanges {
  @Input() items: SlideItem[] = [];
  @Output() activeIndexChange = new EventEmitter<number>();

  /** Swiper config */
  @Input() config: SlideConfig = {
    showNavigation: true,
    showPagination: true,
    autoplay: false,
    slidesPerView: 1,
    spaceBetween: 0,
    autoplayDelay: 3000,
    loop: true,
    breakpoints: undefined
  };

  @Input() trackBy?: (index: number, item: SlideItem) => any;
  @ContentChild(TemplateRef) itemTpl?: TemplateRef<any>;

  uniqueId = Math.random().toString(36).substring(2, 9);
  private swiper: any;

  ngOnInit(): void {
    this.initSwiper();
  }

  ngOnChanges(): void {
    queueMicrotask(() => this.rebuildSwiper());
  }

  ngOnDestroy(): void {
    this.destroySwiper();
  }

  trackByFn = (index: number, item: SlideItem) => {
    if (this.trackBy) return this.trackBy(index, item);

    const id = (item as any)?.id;
    return id !== undefined && id !== null ? `${id}-${index}` : index;
  };

  private async initSwiper() {
    try {
      const {default: Swiper} = await import('swiper');
      setTimeout(() => {
        this.destroySwiper();
        this.swiper = new Swiper(`.mySwiper-${this.uniqueId}`, {
          modules: [Autoplay, Pagination, Navigation],
          loop: this.config?.loop ?? true,
          slidesPerView: this.config?.slidesPerView ?? 1,
          spaceBetween: this.config?.spaceBetween ?? 0,
          breakpoints: this.config?.breakpoints,
          autoplay: this.config?.autoplay ? {
            delay: this.config?.autoplayDelay ?? 2000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          } : false,
          pagination: this.config?.showPagination ? {
            el: `.mySwiper-${this.uniqueId} .swiper-pagination`,
            clickable: true,
          } : false,
          navigation: this.config?.showNavigation ? {
            nextEl: `.mySwiper-${this.uniqueId} .swiper-button-next`,
            prevEl: `.mySwiper-${this.uniqueId} .swiper-button-prev`,
          } : false,
          allowTouchMove: true,
          grabCursor: true,
          observer: true,
          observeParents: true,
          observeSlideChildren: true,
          watchOverflow: true,
          roundLengths: true,
          on: {
            slideChange: (swiper: any) => {
              this.activeIndexChange.emit(swiper.realIndex ?? swiper.activeIndex ?? 0);
            },
          },
        });
        this.activeIndexChange.emit(this.swiper?.realIndex ?? 0);
      });
    } catch (e) {
      console.error('[UniversalSlide] Failed to init Swiper', e);
    }
  }

  private rebuildSwiper() {
    if (!this.swiper) return;
    try {
      this.swiper.params.loop = this.config?.loop ?? true;
      this.swiper.params.slidesPerView = this.config?.slidesPerView ?? 1;
      this.swiper.params.spaceBetween = this.config?.spaceBetween ?? 0;
      this.swiper.params.breakpoints = this.config?.breakpoints;
      this.swiper.params.autoplay = this.config?.autoplay ? {
        delay: this.config?.autoplayDelay ?? 2000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      } : false;

      const root = document.querySelector(`.mySwiper-${this.uniqueId}`) as HTMLElement | null;
      const pag = root?.querySelector('.swiper-pagination') as HTMLElement | null;
      const prev = root?.querySelector('.swiper-button-prev') as HTMLElement | null;
      const next = root?.querySelector('.swiper-button-next') as HTMLElement | null;
      if (pag) pag.style.display = this.config?.showPagination ? '' : 'none';
      if (prev) prev.style.display = this.config?.showNavigation ? '' : 'none';
      if (next) next.style.display = this.config?.showNavigation ? '' : 'none';

      this.swiper.update?.();
    } catch (e) {
      console.warn('[UniversalSlide] rebuild failed', e);
      this.initSwiper();
    }
  }

  private destroySwiper() {
    try {
      this.swiper?.destroy?.(true, true);
    } catch {
    }
    this.swiper = null;
  }
}
