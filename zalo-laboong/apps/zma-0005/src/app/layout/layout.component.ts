import { ChangeDetectorRef, Component, inject, OnInit } from "@angular/core";
import { SpinnerService } from '@core/services/spinner.service';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: false
})
export class LayoutComponent implements OnInit {
  readonly spinner = inject(SpinnerService);
  readonly isLoading$ = this.spinner.isLoading$;
  isHomePage$!: Observable<boolean>;

  private router = inject(Router);

  constructor(private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.isHomePage$ = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects === '/' || event.url === '/'),
      startWith(this.router.url === '/')
    );

    this.isLoading$.subscribe(() => {
      this.cd.markForCheck();
    });
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const bottomHeader = document.querySelector('.bottom-header') as HTMLElement;
    if (!bottomHeader) return;

    const scrollPosition = element.scrollTop;

    if (scrollPosition >= 20) {
      document.querySelector('.flex-1_custom')?.classList.add('scrolled-past-header');
    } else {
      document.querySelector('.flex-1_custom')?.classList.remove('scrolled-past-header');
    }
  }
}
