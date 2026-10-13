import { Component } from '@angular/core';
import {minimizeApp, openChat} from 'zmp-sdk/apis';

@Component({
  selector: 'app-contact-offcanvas',
  templateUrl: 'contactModal.component.html',
  styleUrls: ['contactModal.component.scss'],
  standalone: false,
})
export class ContactOffcanvasComponent {

  minimizeOpenChat() {
    minimizeApp()
      .then(() => {
        openChat({type: 'user', id: '900441440596624596', message: 'Xin chào'});
      })
      .catch((err) => {
        console.error('Lỗi khi thu nhỏ hoặc mở chat:', err);
      });
  }

  callPhone() {
    const zmp = (window as any).zmp;

    zmp.openPhone({
      phoneNumber: "0962911484"
    });
  }
}
