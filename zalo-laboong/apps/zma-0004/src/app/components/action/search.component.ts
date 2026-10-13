import { Component, forwardRef, ViewChild, ElementRef, Input, ChangeDetectionStrategy, OnDestroy, inject, ChangeDetectorRef, Output, EventEmitter, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { IResProduct } from '@shared/models/api';
import { AppCommonComponent } from '@shared/components/app-common.service';
import { SearchBarService, SearchState } from '@shared/services/global/product/search-bar.service';
import { Router } from '@angular/router';
import {uriFeConst} from '@shared/constants';
@Component({
  selector: 'app-search-bar',
  template: `
    <div class="position-relative w-100">
      <input
        #input
        type="text"
        [placeholder]="placeholder"
        class="input-focus w-100 h-12 ps-4-5 pe-3 bg-section border border-secondary text-lg rounded-lg outline-none"
        [value]="value"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (keyup.enter)="onEnter()"
        autocomplete="off"
      />
      <i class="fs-4 ph-bold ph-magnifying-glass position-absolute start-0 ms-3 top-50 translate-middle-y"></i>

      <!-- Clear button -->
      @if (value && value.length > 0) {
        <button
          type="button"
          class="clear-btn"
          (click)="clearSearch()"
          aria-label="Xóa tìm kiếm">
          <i class="ph-bold ph-x"></i>
        </button>
      }

    </div>
    <!-- Dropdown suggestions -->
    @if (searchState.showSuggestions && searchState.suggestions.length > 0) {
      <div class="suggestions-dropdown h-100 overflow-auto">
        <div class="suggestions-list">
          @for (product of searchState.suggestions; track product.id; let i = $index) {
            <div
              class="suggestion-item"
              [class.active]="searchState.selectedIndex === i"
              (click)="selectSuggestion(product)"
              (mouseenter)="updateSelectedIndex(i)">
              <div class="product-image">
                <a href="" [routerLink]="uriFeConst.product.detail"
                   [queryParams]="{ id: product.id }">
                  <img
                    [src]="product.image || 'https://dummyimage.com/40x40/163645/fff'"
                    [alt]="product.name"
                    loading="lazy"
                    onerror="this.src='https://dummyimage.com/40x40/163645/fff'">
                </a>
              </div>
              <div class="product-info">
                <div class="product-name">
                  <a href="" [routerLink]="'/product/detail'"
                     [queryParams]="{ id: product.id }">
                    {{ product.name }}
                  </a>
                </div>
                <div class="product-price">
                  @if (product.prices.contactPrice || !product.prices.price) {
                    <span class="price fw-semibold text-primary">
                          Liên hệ
                        </span>
                  } @else if (product.prices.priceAfterDiscount) {
                    <span class="price fw-semibold text-primary">
                          {{ product.prices.priceAfterDiscount | i18nCurrencyAmount :{showSymbol: true} }}
                        </span>
                    <span class="text-muted text-decoration-line-through ms-2">
                          {{ product.prices.price | i18nCurrencyAmount :{showSymbol: true} }}
                        </span>
                  } @else {
                    <span class="price fw-semibold text-primary">
                          {{ product.prices.price | i18nCurrencyAmount :{showSymbol: true} }}
                        </span>
                    @if (product.prices.priceOld) {
                      <span class="text-muted text-decoration-line-through ms-2">
                            {{ product.prices.priceOld | i18nCurrencyAmount :{showSymbol: true} }}
                          </span>
                    }
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }

    @if (searchState.showSuggestions && !searchState.isLoading && value && value.length > 0 && searchState.suggestions.length === 0) {
      <div class="suggestions-dropdown">
        <div class="no-results">
          <i class="ph-bold ph-magnifying-glass"></i>
          <span>Không tìm thấy sản phẩm nào cho "{{ value }}"</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .input-focus:focus {
      border-color: #dc3545 !important;
    }

    .clear-btn {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: none;
      border: none;
      color: #6b7280;
      font-size: 16px;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 50%;
      width: 1.5rem;
      height: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .clear-btn:hover {
      background-color: #f3f4f6;
      color: #374151;
    }

    .bg-section {
      background-color: #f7f7f8;
    }

    .rounded-lg {
      border-radius: 0.5rem;
    }

    .h-12 {
      height: 3rem;
    }

    .ps-4-5 {
      padding-left: 3rem;
    }

    .suggestions-dropdown {
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .suggestions-header {
      padding: 0.75rem 1rem 0.5rem;
      border-bottom: 1px solid #f3f4f6;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #f9fafb;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .text-muted {
      color: #6b7280;
    }

    .loading-spinner {
      color: #3b82f6;
    }

    .suggestion-item {
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.15s ease;
    }

    .suggestion-item:hover,
    .suggestion-item.active {
      background-color: #f8fafc;
    }

    .suggestion-item:last-child {
      border-bottom: none;
    }

    .product-image {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 0.375rem;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }

    .product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .product-info {
      flex: 1;
      min-width: 0;
    }

    .product-name {
      font-weight: 500;
      color: #111827;
      font-size: 0.875rem;
      line-height: 1.25rem;
      margin-bottom: 0.25rem;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-price {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .price {
      color: #dc2626;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .price-discount {
      color: #dc2626;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .price-original {
      color: #6b7280;
      font-size: 0.75rem;
      text-decoration: line-through;
    }

    .product-category {
      flex-shrink: 0;
    }

    .category-badge {
      background-color: #e5e7eb;
      color: #374151;
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
    }

    .suggestions-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid #f3f4f6;
      background-color: #f9fafb;
    }

    .view-all-btn {
      width: 100%;
      padding: 0.5rem;
      background: none;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      color: #374151;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-all-btn:hover {
      background-color: #f3f4f6;
      border-color: #9ca3af;
    }

    .no-results {
      padding: 2rem 1rem;
      text-align: center;
      color: #6b7280;
    }

    .no-results i {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      display: block;
    }

    /* Responsive */
    @media (max-width: 640px) {

      .suggestion-item {
        padding: 1rem 0;
        gap: 0.5rem;
      }

      .product-image {
        width: 50px;
        height: 50px;
      }
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchBarComponent),
      multi: true,
    },
    SearchBarService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class SearchBarComponent extends AppCommonComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() placeholder = 'Bạn muốn mua gì ...';
  @Input() searchLimit = 8;
  @Input() debounceTime = 300;
  @Output() productSelected = new EventEmitter<IResProduct>();
  @ViewChild('input', { static: true }) inputEl!: ElementRef<HTMLInputElement>;

  private searchBarService = inject(SearchBarService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  value = '';
  searchState: SearchState = {
    suggestions: [],
    showSuggestions: false,
    isLoading: false,
    selectedIndex: -1
  };
  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    super();
  }
  ngOnInit() {
    this.searchBarService.setupSearch({
      maxResults: this.searchLimit,
      delay: this.debounceTime
    })
      .pipe(takeUntil(this.destroyed))
      .subscribe(state => {
        this.searchState = state;
        this.cdr.markForCheck();
      });
  }
  ngOnDestroy() {
    this.getDestroySubs();
  }
  writeValue(val: string): void {
    this.value = val ?? '';
    this.inputEl.nativeElement.value = this.value;
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void {
    this.inputEl.nativeElement.disabled = isDisabled;
  }

  // Handlers
  onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    this.onChange(this.value);
    this.searchBarService.search(this.value);
  }
  onFocus() {
    if (this.value.trim().length >= 2) {
      this.searchBarService.search(this.value);
    }
  }
  onEnter() {
    const query = this.value.trim();
    if (query.length > 0) {
      this.hideDropdown();
      this.router.navigate(['/product/searchproduct'], {
        queryParams: { q: query }
      });
    }
  }
  selectSuggestion(product: IResProduct) {
    this.value = product.name;
    this.inputEl.nativeElement.value = this.value;
    this.onChange(this.value);
    this.productSelected.emit(product);
    this.hideDropdown();
  }
  clearSearch() {
    this.value = '';
    this.inputEl.nativeElement.value = '';
    this.onChange('');
    this.hideDropdown();
    this.inputEl.nativeElement.focus();
  }
  updateSelectedIndex(index: number) {
    this.searchState = { ...this.searchState, selectedIndex: index };
    this.cdr.markForCheck();
  }
  private hideDropdown() {
    this.searchState = { ...this.searchState, showSuggestions: false, selectedIndex: -1 };
    this.cdr.markForCheck();
  }

  protected readonly uriFeConst = uriFeConst;
}
