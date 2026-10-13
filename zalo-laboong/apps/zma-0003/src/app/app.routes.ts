import {Routes} from '@angular/router';
import {LayoutComponent} from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./pages/home/home.module').then(m => m.HomeModule)
      },
      {
        path: 'news',
        loadChildren: () =>
          import('./pages/news/news.module').then(m => m.NewsModule)
      },
      {
        path: 'product',
        loadChildren: () =>
          import('./pages/products/products.module').then(m => m.ProductsModule)
      },
      {
        path: 'user',
        loadChildren: () =>
          import('./pages/user/user.module').then(m => m.UserModule)
      },
      {
        path: 'checkout',
        loadChildren: () =>
          import('./pages/checkout/checkout.module').then(m => m.CheckoutModule)
      },
      {
        path: 'order',
        loadChildren: () =>
          import('./pages/order/order.module').then(m => m.OrderModule)
      },
      {
        path: 'luckywheel',
        loadChildren: () =>
          import('./pages/game/game.module').then(m => m.GameModule)
      },
    ]
  },
  // Redirect bất kỳ đường dẫn không khớp nào về trang chủ
  {path: '**', redirectTo: '', pathMatch: 'full'}
];
