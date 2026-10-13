import {Component, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';

@Component({
  selector: 'app-about-us',
  template: `
    <div id="about-us" class="about-section">
      <div class="container">
        <h2>Giới thiệu Nhanh.vn</h2>
        <p>
          <strong>Nhanh.vn</strong> là nền tảng quản lý và bán hàng đa kênh hàng đầu tại Việt Nam,
          giúp doanh nghiệp kết nối cửa hàng, website, mạng xã hội và sàn thương mại điện tử
          trong một hệ thống duy nhất.
        </p>
        <p>
          Với sứ mệnh <strong>“Giúp chủ cửa hàng quản lý dễ dàng – bán hàng hiệu quả – phát triển bền vững”</strong>,
          chúng tôi cung cấp các giải pháp toàn diện về quản lý bán hàng, website, vận chuyển và marketing.
        </p>
        <p>
          Nhanh.vn đồng hành cùng hơn <strong>100.000 doanh nghiệp</strong> trên hành trình chuyển đổi số,
          mang đến <strong>hiệu quả, minh bạch và tiết kiệm</strong> cho mọi hoạt động kinh doanh.
        </p>
      </div>
    </div>
  `,
  standalone: false
})

export class AboutUsComponent extends AppCommonComponent implements OnInit{


  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Về chúng tôi'});
    this.setFooter({variant: 'tabs', show: false});
  }
}
