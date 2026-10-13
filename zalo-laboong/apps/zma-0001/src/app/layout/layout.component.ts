import {ChangeDetectorRef, Component, inject, OnInit} from "@angular/core";
import {SpinnerService} from '@core/services/spinner.service';
import {NgbOffcanvasOptions} from '@ng-bootstrap/ng-bootstrap';
import {OffcanvasCustomService} from '@shared/services/global';
import {ShareLinkComponent} from '@shared/components/actions/share-link/share-link.component';

@Component({
  selector: 'app-home',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: false
})
export class LayoutComponent implements OnInit {
  readonly spinner = inject(SpinnerService);
  readonly isLoading$ = this.spinner.isLoading$;

  constructor(
    private cd: ChangeDetectorRef,
    private offcanvas: OffcanvasCustomService
  ) {
  }

  ngOnInit() {
    this.isLoading$.subscribe(_ => {
      this.cd.markForCheck();
    });
  }

  openShare(): void {
    const opts: NgbOffcanvasOptions = {
      position: 'bottom',
      backdrop: true,
      keyboard: true,
      scroll: false,
      container: 'body',
      panelClass: 'offcanvas-bottom-sheet',
    };
    const ref = this.offcanvas.open(ShareLinkComponent, opts);
    ref.componentInstance.url = location.href;
    ref.componentInstance.title = 'Chia sẻ Nhanh Shop';
  }
}
