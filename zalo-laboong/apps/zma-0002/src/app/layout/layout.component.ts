import {ChangeDetectorRef, Component, inject, OnInit} from "@angular/core";
import {SpinnerService} from '@core/services/spinner.service';

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
    private cd: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    this.isLoading$.subscribe(_ => {
      this.cd.markForCheck();
    });
  }
}
