import { Component, OnInit } from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';
interface Tab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-voucher',
  standalone: false,
  templateUrl: './voucher.component.html',
  styleUrls: ['./voucher.component.scss'],
})
export class VoucherComponent extends AppCommonComponent implements OnInit {
  checkedIn = true;

  benefits = [
    { title: 'Giới thiệu thành viên mới', points: 200 },
    { title: 'Chia sẻ tạo affiliate', points: 200 },
    { title: 'Điền form khảo sát', points: 200 },
    { title: 'Điểm danh hàng ngày', points: 100 }
  ];

  voucher = {
    code: 'sFEI3ypTQV',
    expire: new Date('2025-10-31')
  };

  ngOnInit() {
    this.setHeader({
      variant: 'title',
      show: true,
      back: true,
      title: 'Voucher của tôi',
      className: 'bg-white text-invert',
    });
    this.setFooter({
      variant: 'tabs',
      show: false,
    });
  }

  openTerms(){
    // Mở modal/route điều kiện nếu có
    alert('Điều kiện áp dụng: …');
  }
}
