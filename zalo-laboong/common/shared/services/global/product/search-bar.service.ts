import { Injectable, inject } from '@angular/core';
import { Subject, of, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, startWith } from 'rxjs/operators';
import {IResProductInList} from '@shared/models/api';
import {ProductApiService} from '../../api';
export interface SearchState {
  suggestions: IResProductInList[];
  isLoading: boolean;
  showSuggestions: boolean;
  selectedIndex: number;
}
export interface SearchOptions {
  maxResults: number;
  delay: number;
  minLength: number;
}

@Injectable()
export class SearchBarService {
  private readonly productApi = inject(ProductApiService);
  private readonly searchSubject = new Subject<string>();

  setupSearch(options: Partial<SearchOptions> = {}): Observable<SearchState> {
    const { maxResults = 8, delay = 300, minLength = 2 } = options;
    return this.searchSubject.pipe(
      debounceTime(delay),
      distinctUntilChanged(),
      switchMap(query => this.handleSearch(query, maxResults, minLength))
    );
  }

  search(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Xử lý tìm kiếm
   */
  private handleSearch(query: string, maxResults: number, minLength: number): Observable<SearchState> {
    const trimmed = query?.trim() ?? '';

    // Nếu query rỗng hoặc ngắn hơn minLength → reset
    if (trimmed.length < minLength) {
      return of(this.emptyState());
    }

    // Bắn trạng thái loading ngay khi gọi API
    return this.callSearchAPI(trimmed, maxResults).pipe(
      map(products => {
        return {
          suggestions: products,
          showSuggestions: products.length > 0,
          selectedIndex: -1,
          isLoading: false
        }
      }),
      startWith({
        ...this.emptyState(),
        isLoading: true
      }),
      catchError(err => {
        console.error('Search error:', err);
        return of(this.emptyState());
      })
    );
  }
  private callSearchAPI(searchTerm: string, limit: number): Observable<IResProductInList[]> {
    return this.productApi.suggestionSearchProduct({ pageSize: limit, name: searchTerm }).pipe(
      map(res => this.extractProducts(res)),
      catchError(error => {
        console.error('API Error:', error);
        return of([]);
      })
    );
  }

  private extractProducts(response: any): IResProductInList[] {
    const data = response?.data;
    if (!data) return [];

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.result)) return data.result;

    return [];
  }
  private emptyState(): SearchState {
    return { suggestions: [], showSuggestions: false, selectedIndex: -1, isLoading: false };
  }
}
