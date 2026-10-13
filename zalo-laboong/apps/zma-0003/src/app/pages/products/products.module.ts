import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedCommonModule} from '@shared/shared-common.module';
import {ProductsRouting} from './products.routing';
import {ProductCategoryComponent} from './features/category/product-category.component';
import { ProductSearchComponent } from './features/search/product-search.component';
import { ProductDetailComponent } from './features/detail/product-detail.component';
import {UniversalSlideComponent} from '@shared/components/actions';
import {ShareButtonComponent} from '../../components/actions/share-button.component';
import {FavoriteActiveDirective, OpenFavoriteSheetDirective} from '@shared/directives';
@NgModule({
  declarations: [
    ProductCategoryComponent,
    ProductSearchComponent,
    ProductDetailComponent,
  ],
  imports: [
    CommonModule,
    SharedCommonModule,
    ProductsRouting,
    UniversalSlideComponent,
    ShareButtonComponent,
    FavoriteActiveDirective,
    OpenFavoriteSheetDirective
  ]
})
export class ProductsModule {}
