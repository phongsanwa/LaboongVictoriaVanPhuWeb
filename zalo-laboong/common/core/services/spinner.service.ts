import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable({providedIn: 'root'})
export class SpinnerService {
  private _loading = new BehaviorSubject<boolean>(false);
  /** Observable để component subscribe */
  readonly isLoading$: Observable<boolean> = this._loading.asObservable();

  private defer(fn: () => void) {
    if (typeof queueMicrotask === 'function') queueMicrotask(fn);
    else setTimeout(fn, 0);
  }

  /** Gọi để bật spinner */
  show(): void {
    this.defer(() => this._loading.next(true));
  }

  /** Gọi để tắt spinner */
  hide(): void {
    this.defer(() => this._loading.next(false));
  }
}
