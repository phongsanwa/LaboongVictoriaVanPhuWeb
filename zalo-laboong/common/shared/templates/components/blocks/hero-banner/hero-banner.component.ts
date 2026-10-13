import {ChangeDetectionStrategy, Component, inject, Input, OnInit} from '@angular/core';
import {SlideConfig, SlideItem} from '../../../../components/actions';
import {IZmaHeroBannerBlockDefaults, IZmaHeroBannerSlide, ZmaHeroBannerType} from '../../../models/zma-template.model';
import {Router} from '@angular/router';

@Component({
  selector: 'app-zma-hero-banner',
  templateUrl: './hero-banner.component.html',
  styleUrls: ['./hero-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class HeroBannerComponent implements OnInit {
  @Input() data!: IZmaHeroBannerBlockDefaults;
  @Input() debug = false;

  private router = inject(Router);

  /** Config default cho universal slide */
  heroSlideConfig: SlideConfig = {
    showNavigation: false,
    showPagination: true,
    autoplay: false,
    slidesPerView: 1,
    spaceBetween: 0,
    autoplayDelay: 3000,
    loop: true,
    breakpoints: undefined,
  };

  ngOnInit() {
    if (this.debug) {
      console.log('[HeroBannerComponent] data =', this.data);
      console.log('[HeroBannerComponent] type =', this.bannerType);
      console.log('[HeroBannerComponent] slides =', this.data?.slides);
      console.log('[HeroBannerComponent] carouselItems =', this.carouselItems);
    }
  }

  /** Kiểu banner, default = simple */
  get bannerType(): ZmaHeroBannerType {
    return (this.data.type) as ZmaHeroBannerType;
  }

  /** Có slide hay không */
  get hasSlides(): boolean {
    return !!this.data?.slides && this.data.slides.length > 0;
  }

  /** Slide đầu tiên cho kiểu simple */
  get firstSlide(): IZmaHeroBannerSlide | null {
    if (!this.hasSlides) return null;
    return this.data!.slides![0];
  }

  /** Map slides sang SlideItem[] cho universal-slide */
  get carouselItems(): SlideItem[] {
    if (!this.data?.slides?.length) return [];
    return this.data.slides.map((s) => ({
      image: s.imageUrl,
      title: s.title,
      name: s.title,
      href: s.href,
      routerLink: s.routerLink,
      queryParams: s.queryParams,
      subtitle: s.subtitle,
      ctaText: s.ctaText,
      raw: s,
    }));
  }

  goToSearch(): void {
    this.router.navigate(['/product/search']);
  }
}
