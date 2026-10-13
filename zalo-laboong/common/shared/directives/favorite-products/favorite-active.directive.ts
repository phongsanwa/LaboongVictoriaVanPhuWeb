import {
  Directive,
  HostBinding,
  Input,
  OnDestroy,
  OnInit,
  inject,
  OnChanges,
  ChangeDetectorRef,
  SimpleChanges
} from '@angular/core';
import {Subject, Subscription, takeUntil} from 'rxjs';
import {FavoriteStateService} from '../../services/global/favorite-product/favorite-state.service';

@Directive({
  selector: '[appFavoriteActive]',
  standalone: true
})
export class FavoriteActiveDirective implements OnInit, OnChanges, OnDestroy {
  private favState = inject(FavoriteStateService);
  private cdr = inject(ChangeDetectorRef);

  @Input('appFavoriteActive') productId!: string | number;
  @HostBinding('class.active') isActive = false;

  private sub?: Subscription;

  ngOnInit() { this.watch(); }
  ngOnChanges(_: SimpleChanges) { this.watch(); }

  private watch() {
    this.sub?.unsubscribe();

    const id = this.productId;
    if (id == null || id === '') {
      this.isActive = false;
      this.cdr.markForCheck();
      return;
    }

    this.sub = this.favState.has$(id).subscribe((v) => {
      this.isActive = v;
      this.cdr.markForCheck()
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}
