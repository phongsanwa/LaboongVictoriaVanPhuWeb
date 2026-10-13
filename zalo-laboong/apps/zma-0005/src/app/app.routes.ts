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
        path: 'product',
        loadChildren: () =>
          import('./pages/products/products.module').then(m => m.ProductsModule)
      },
      {
        path: 'news',
        loadChildren: () =>
          import('./pages/news/news.module').then(m => m.NewsModule)
      },
      {
        path: 'user',
        loadChildren: () =>
          import('./pages/user/user.module').then(m => m.UserModule)
      },
      {
        path: 'cart',
        loadChildren: () =>
          import('./pages/cart/cart.module').then(m => m.CartModule)
      },
      {
        path: 'checkout',
        loadChildren: () =>
          import('./pages/checkout/checkout.module').then(m => m.CheckoutModule)
      },
    ]
  },
  // Redirect bất kỳ đường dẫn không khớp nào về trang chủ
  {path: '**', redirectTo: '', pathMatch: 'full'}
];
