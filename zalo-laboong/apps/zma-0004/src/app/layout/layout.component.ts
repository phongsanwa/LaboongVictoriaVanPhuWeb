import {AfterViewInit, ChangeDetectorRef, Component, inject, Input, OnInit, ViewChild} from "@angular/core";
import {SpinnerService} from '@core/services/spinner.service';
import {Subject} from 'rxjs';
import {AppHeaderComponent} from '../components/header/header.component';

@Component({
  selector: 'app-home',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: false
})
export class LayoutComponent implements OnInit, AfterViewInit {
  @Input() headerClass: string = '';
  readonly spinner = inject(SpinnerService);
  readonly isLoading$ = this.spinner.isLoading$;
  isScrolled: boolean = false;

  @ViewChild(AppHeaderComponent) header!: AppHeaderComponent;
  searchModal$ = new Subject<string>();

  constructor(
    private cd: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    this.isLoading$.subscribe(_ => {
      this.cd.markForCheck();
    });
  }

  ngAfterViewInit() {
    //gọi modal vào để tìm nhanh bằng name
    this.searchModal$.subscribe((nameSearch: string) => {
      if (this.header) {
        this.header.openSearchModal(nameSearch);
      }
    });
  }

  onWindowScroll(event: Event) {
    const target = event.target as HTMLElement;
    this.isScrolled = target.scrollTop > 0;
  }

  //Tính height header
  onHeaderHeight(h: number) {
    document.documentElement.style.setProperty('--header-height', `${h}px`);
  }
}
