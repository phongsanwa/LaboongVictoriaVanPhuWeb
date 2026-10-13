import {
  Injectable, NgZone, OnDestroy,
} from '@angular/core';
import { NgbOffcanvas, NgbOffcanvasOptions, NgbOffcanvasRef } from '@ng-bootstrap/ng-bootstrap';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OffcanvasCustomService implements OnDestroy {
  private popListenerBound = false;
  private onPopState = () => this.zone.run(() => this.safeDismiss('popstate'));

  constructor(
    private offcanvas: NgbOffcanvas,
    private router: Router,
    private zone: NgZone
  ) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(() => this.safeDismiss('route-change'));

    if (typeof window !== 'undefined' && !this.popListenerBound) {
      window.addEventListener('popstate', this.onPopState);
      this.popListenerBound = true;
    }
  }

  open(content: any, options?: NgbOffcanvasOptions): NgbOffcanvasRef {
    return this.offcanvas.open(content, options);
  }

  dismissAll(reason?: any): void {
    this.safeDismiss(reason ?? 'manual');
  }

  hasOpenOffcanvas(): boolean {
    return this.offcanvas.hasOpenOffcanvas();
  }

  private safeDismiss(reason?: any) {
    try {
      if (this.offcanvas.hasOpenOffcanvas()) {
        this.offcanvas.dismiss(reason);
      }
    } catch { /* noop */ }
  }

  ngOnDestroy(): void {
    if (this.popListenerBound && typeof window !== 'undefined') {
      window.removeEventListener('popstate', this.onPopState);
      this.popListenerBound = false;
    }
  }
}
