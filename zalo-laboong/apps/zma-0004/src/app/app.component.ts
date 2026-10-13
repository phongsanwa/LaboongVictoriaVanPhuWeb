import {Component, OnInit, ViewEncapsulation} from "@angular/core";
import {NavigationEnd, Router} from "@angular/router";
import {filter} from "rxjs";
import {ZmpService} from '@core/services/zmp-service/zmp.service';
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
export class AppComponent implements OnInit {
  title = 'fashion-app-1';
  constructor(private router: Router,private zmpService: ZmpService) {}

  ngOnInit() {
    this.router.events.pipe(
      // đây là type-predicate: tells TS “nếu true thì evt is NavigationEnd”
      filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd)
    ).subscribe(evt => {
      // TS now knows evt is NavigationEnd
      console.log('Navigated to:', evt.urlAfterRedirects);
    });

    //check systemInfor
    this.zmpService.initSystemInfo$().subscribe();

    // Nếu Android, cộng thêm 6px
    document.documentElement.style.setProperty(
      '--zaui-safe-extra-top',
      isAndroid() ? '6px' : '0px'
    );
  }
}
