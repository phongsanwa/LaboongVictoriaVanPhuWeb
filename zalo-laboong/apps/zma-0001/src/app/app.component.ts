import {AfterViewInit, Component, OnInit, ViewEncapsulation} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {filter} from "rxjs";
import {AppUrlService} from '@core/services/app-url.service';
import {isAndroid} from '@core/utils/app.utils';

@Component({
  selector: '[id=app]',
  template: `<router-outlet></router-outlet>`,
  standalone: false,
  styles: [`
    :host { display: block; height: 100%; }
  `],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'fashion-app-1';
  constructor(
    private router: Router,
    private urlSvc: AppUrlService
  ) {}

  ngOnInit() {
    this.router.events.pipe(
      // đây là type-predicate: tells TS “nếu true thì evt is NavigationEnd”
      filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd)
    ).subscribe(evt => {
      // TS now knows evt is NavigationEnd
      this.urlSvc.recomputeBaseFrom(location.href);
    });

    // Nếu Android, cộng thêm 6px
    document.documentElement.style.setProperty(
      '--zaui-safe-extra-top',
      isAndroid() ? '6px' : '0px'
    );
  }

  ngAfterViewInit(): void {
    // Dùng để debug xem style top và bottom có hoạt động hay không
    // Lưu ý là chỉ dùng ở local, tuyệt đối không commit code

    // const top = this.readCssVar('--zaui-safe-area-inset-top');
    // const bottom = this.readCssVar('--zaui-safe-area-inset-bottom');
    // console.log({ top, bottom });
    // window.addEventListener('resize', () => {
    //   console.log({
    //     top: this.readCssVar('--zaui-safe-area-inset-top'),
    //     bottom: this.readCssVar('--zaui-safe-area-inset-bottom'),
    //   });
    // });
  }

  // private readCssVar(name: string): string {
  //   const probe = document.createElement('div');
  //   probe.style.position = 'absolute';
  //   probe.style.visibility = 'hidden';
  //   probe.style.paddingTop = `var(${name})`;
  //   document.body.appendChild(probe);
  //   const px = getComputedStyle(probe).paddingTop;
  //   probe.remove();
  //   return px;
  // }
}
