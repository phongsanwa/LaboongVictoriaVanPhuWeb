import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Input, Output,
  signal,
  ViewChild
} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {IHeaderConfig, IHeaderGreetingConfig, IHeaderTitleConfig} from '@shared/models/global';
import {uriFeConst} from '@shared/constants';
import {HeaderFooterFacadeService} from '@shared/services/global/layout-service/header-footer-facade.service';
import {SearchBarComponent} from '../action/search.component';
import {Router} from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AppHeaderComponent implements AfterViewInit{
  private readonly facade = inject(HeaderFooterFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  @Input() headerClass: string = '';
  cfg?: IHeaderConfig;
  isSearchModalOpen = signal(false);
  @Output() heightChange = new EventEmitter<number>();
  @ViewChild('headerRef') headerRef!: ElementRef;
  @ViewChild('searchBar') searchBar!: SearchBarComponent;

  constructor(
    private _router: Router
  ) {
    this.facade.header$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cfg => {
        this.cfg = cfg;
        this.cdr.markForCheck();
      });
  }


  ngAfterViewInit() {
    //tính chiều cao header để eat-today stick top
    if (this.headerRef) {
      const h = this.headerRef.nativeElement.offsetHeight;
      this.heightChange.emit(h);
    } else {
      this.heightChange.emit(0); // không có header → height = 0
    }
  }


  back() {
    this.facade.back();
  }

  isGreeting(c: IHeaderConfig): c is IHeaderGreetingConfig {
    return c.variant === 'greeting';
  }

  isTitle(c: IHeaderConfig): c is IHeaderTitleConfig {
    return c.variant === 'title';
  }


  openSearchModal(nameSearch?: string) {
    this.isSearchModalOpen.set(true);

    //mở modal focus inpus luôn
    setTimeout(() => {
      if (this.searchBar && this.searchBar.inputEl) {
        this.searchBar.inputEl.nativeElement.focus();

        if (nameSearch) {
          this.searchBar.writeValue(nameSearch);
          this.searchBar.onInput({ target: { value: nameSearch } } as any);
        }
      }
    }, 50);
  }

  closeSearchModal() {
    this.isSearchModalOpen.set(false);
  }


  isCategoryPage(): boolean {
    return this._router.url.includes('/product/category');
  }

  protected readonly uriFeConst = uriFeConst;
}
