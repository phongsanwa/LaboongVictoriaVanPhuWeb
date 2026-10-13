import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {NgbActiveOffcanvas} from '@ng-bootstrap/ng-bootstrap';
import {ICartData, ICartItem} from '@shared/models/feature-specific';
import {CartManageService} from '@shared/services/global/cart/cart-manage.service';
import {Router} from '@angular/router';
import {KeyValuePipe} from '@angular/common';
import {SharedCommonModule} from '@shared/shared-common.module';
import {filter, map, Subject, take, takeUntil} from 'rxjs';
import {tap} from 'rxjs/operators';
import {NotifyService} from '@core/services';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {uriFeConst} from "@shared/constants";
import {PromotionEvaluateService} from '@shared/services/feature-specific';
import {IGiftRule, IPromotionEvaluateData} from '@shared/models/api';

interface ICartGiftDisplayProduct {
  productId: number;
  name: string;
  image: string;
  quantity: number;
  price: number;
  priceOld: number;
}

interface ICartGiftChoice {
  id: string;
  ruleId: number;
  title?: string;
  products: ICartGiftDisplayProduct[];
  selected: boolean;
}

@Component({
  selector: 'app-cart-modal',
  templateUrl: 'cart-modal.component.html',
  styleUrls: ['cart-modal.component.scss'],
  imports: [
    KeyValuePipe,
    SharedCommonModule
  ],
  standalone: true
})

export class CartModalComponent implements OnInit, OnDestroy {
  @Input() cartData!: ICartData;
  selectedIds = new Set<number>();
  productGiftChoicesMap: Record<number, ICartGiftChoice[]> = {};
  billGiftChoices: ICartGiftChoice[] = [];
  productGiftsMap: Record<number, ICartGiftDisplayProduct[]> = {};
  billGifts: ICartGiftDisplayProduct[] = [];
  promoResult: IPromotionEvaluateData | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    public active: NgbActiveOffcanvas,
    public cartService: CartManageService,
    private router: Router,
    private notifyService: NotifyService,
    private appFm: AppFormAddService,
    private promoService: PromotionEvaluateService
  ) {
  }
  ngOnInit() {
    this.selectedIds = new Set(this.itemsCart.map(item => item.productId));
    this.evaluateCartGifts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.appFm.getDestroySubs()
  }

  get itemsCart() {
    return Object.values(this.cartData.items ?? {});
  }

  get isAllSelected(): boolean {
    const items = this.itemsCart;
    return items.length > 0 && items.every(item => this.selectedIds.has(item.productId));
  }

  get selectedCount(): number {
    return this.itemsCart
      .filter(item => this.selectedIds.has(item.productId))
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  get selectedTotal(): number {
    return this.itemsCart
      .filter(item => this.selectedIds.has(item.productId))
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  toggleSelectAll(): void {
    this.selectedIds = this.isAllSelected
      ? new Set<number>()
      : new Set(this.itemsCart.map(item => item.productId));
    this.evaluateCartGifts();
  }

  toggleSelect(item: ICartItem): void {
    const next = new Set(this.selectedIds);
    next.has(item.productId) ? next.delete(item.productId) : next.add(item.productId);
    this.selectedIds = next;
    this.evaluateCartGifts();
  }

  onQuantityChange(item: ICartItem, qty: number) {
    this.cartService.updateCartItemQuantity(item.productId, qty);

    this.cartData = this.cartService.getCartData();
    this.evaluateCartGifts();
  }

  /**
   * Xử lí xóa toàn bộ SP khỏi giỏ hàng
   * */
  removeAllCart() {
    this.notifyService
      .dialogConfirmDelete({
        size: 'sm',
        title: 'Xác Nhận',
        content: 'Bạn có chắc muốn xoá hết sản phẩm khỏi giỏ hàng?',
        variant: 'modern'
      })
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),
        tap(() => {
          this.cartService.clearCart();
          this.cartData = this.cartService.getCartData();
          this.selectedIds = new Set();
          this.productGiftChoicesMap = {};
          this.billGiftChoices = [];
          this.productGiftsMap = {};
          this.billGifts = [];
          this.cartService.clearGiftSelections();
          this.cartService.clearCheckoutPromoSnapshot();
          this.notifyService.success('Đã xoá sản phẩm thành công.');
        }),
        takeUntil(this.appFm.destroyed)
        ).subscribe();
  }
  /**
   * Xử lí xóa SP khỏi giỏ hàng
   * */
  onRemoveProduct(item: ICartItem) {
    if (!item.productId) return;

    this.notifyService
      .dialogConfirmDelete({
        size: 'sm',
        title: 'Xác Nhận',
        content: 'Bạn có chắc muốn xoá sản phẩm này khỏi giỏ hàng?',
        variant: 'modern'
      })
      .pipe(
        take(1),
        map((res: { confirmDelete?: boolean } | undefined) => !!res?.confirmDelete),
        filter(Boolean),
        tap(() => {
          this.cartService.onRemoveCartItem(item);
          this.cartData = this.cartService.getCartData();
          const next = new Set(this.selectedIds);
          next.delete(item.productId);
          this.selectedIds = next;
          this.evaluateCartGifts();
          this.notifyService.success('Đã xoá sản phẩm thành công.');
        }),
        takeUntil(this.appFm.destroyed)
      ).subscribe();
  }

  toCheckout() {
    const selected = this.itemsCart.filter(item => this.selectedIds.has(item.productId));
    if (!selected.length) {
      this.notifyService.warning('Vui lòng chọn sản phẩm trước khi thanh toán');
      return;
    }

    const missingProductGift = selected.some(item =>
      (this.productGiftChoicesMap[item.productId]?.length ?? 0) > 0 &&
      !this.getProductGifts(item.productId).length,
    );
    if (missingProductGift) {
      this.notifyService.warning('Vui lòng chọn quà tặng cho sản phẩm trước khi thanh toán');
      return;
    }

    if (this.billGiftChoices.length && !this.billGifts.length) {
      this.notifyService.warning('Vui lòng chọn quà tặng trước khi thanh toán');
      return;
    }

    this.persistGiftDisplays();
    const ok = this.cartService.stashUncheckedForCheckout(selected.map(item => item.productId));
    if (!ok) return;
    this.cartService.setCheckoutPromoSnapshot(this.promoResult);
    this.active.close();
    this.router.navigate(['/checkout']);
  }

  getProductGifts(productId: number): ICartGiftDisplayProduct[] {
    return this.productGiftsMap[productId] ?? [];
  }

  selectProductGift(productId: number, choice: ICartGiftChoice): void {
    const choices = this.productGiftChoicesMap[productId] ?? [];
    this.productGiftChoicesMap = {
      ...this.productGiftChoicesMap,
      [productId]: this.selectSingleChoiceByRule(choices, choice),
    };
    this.productGiftsMap = {
      ...this.productGiftsMap,
      [productId]: this.productGiftChoicesMap[productId]
        .filter(item => item.selected)
        .flatMap(item => item.products),
    };
    this.persistGiftDisplays();
  }

  selectBillGift(choice: ICartGiftChoice): void {
    this.billGiftChoices = this.selectSingleChoiceByRule(this.billGiftChoices, choice);
    this.billGifts = this.billGiftChoices
      .filter(item => item.selected)
      .flatMap(item => item.products);
    this.persistGiftDisplays();
  }

  private evaluateCartGifts(): void {
    const items = this.itemsCart.filter(item => this.selectedIds.has(item.productId));
    if (!items.length) {
      this.productGiftChoicesMap = {};
      this.billGiftChoices = [];
      this.productGiftsMap = {};
      this.billGifts = [];
      this.cartService.clearGiftSelections();
      this.cartService.clearCheckoutPromoSnapshot();
      return;
    }

    const evalItems = items.map(item => ({
      productId: item.productId,
      price: item.price,
      quantity: item.quantity,
    }));

    this.promoService.evaluateImmediate$(evalItems)
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => this.buildGiftDisplays(result));
  }

  private buildGiftDisplays(result: IPromotionEvaluateData | null): void {
    this.promoResult = result;
    this.cartService.setCheckoutPromoSnapshot(result);

    if (!result?.gifts) {
      this.productGiftsMap = {};
      this.productGiftChoicesMap = {};
      this.billGiftChoices = [];
      this.billGifts = [];
      this.cartService.clearGiftSelections();
      return;
    }

    const previousProductChoices = this.productGiftChoicesMap;
    const previousBillChoices = this.billGiftChoices;
    const nextProductChoices: Record<number, ICartGiftChoice[]> = {};
    let nextBillChoices: ICartGiftChoice[] = [];

    for (const applied of result.gifts.bill?.applied ?? []) {
      for (const rule of applied.rules) {
        nextBillChoices.push(...this.mapGiftRuleToChoices(rule));
      }
    }
    nextBillChoices = this.restoreChoiceSelection(nextBillChoices, previousBillChoices);

    for (const item of this.itemsCart) {
      if (!this.selectedIds.has(item.productId)) continue;
      const productGift = result.gifts.products?.[item.productId];
      let choices: ICartGiftChoice[] = [];
      for (const applied of productGift?.applied ?? []) {
        for (const rule of applied.rules) {
          choices.push(...this.mapGiftRuleToChoices(rule));
        }
      }
      choices = this.restoreChoiceSelection(choices, previousProductChoices[item.productId] ?? []);
      if (choices.length) nextProductChoices[item.productId] = choices;
    }

    this.productGiftChoicesMap = nextProductChoices;
    this.billGiftChoices = nextBillChoices;
    const selectedProductGifts: Record<number, ICartGiftDisplayProduct[]> = {};
    for (const [productId, choices] of Object.entries(nextProductChoices)) {
      const gifts = choices
        .filter(choice => choice.selected)
        .flatMap(choice => choice.products);
      if (gifts.length) selectedProductGifts[Number(productId)] = gifts;
    }
    this.productGiftsMap = selectedProductGifts;
    this.billGifts = nextBillChoices
      .filter(choice => choice.selected)
      .flatMap(choice => choice.products);
    this.persistGiftDisplays();
  }

  private mapGiftRuleToChoices(rule: IGiftRule): ICartGiftChoice[] {
    const choices: ICartGiftChoice[] = [];

    for (const gift of rule.giftItems ?? []) {
      choices.push({
        id: `${rule.ruleId}-item-${gift.productId}`,
        ruleId: rule.ruleId,
        products: [this.mapGiftProduct(gift)],
        selected: false,
      });
    }

    for (const combo of rule.giftCombos ?? []) {
      choices.push({
        id: `${rule.ruleId}-combo-${combo.comboKey}`,
        ruleId: rule.ruleId,
        title: combo.label ?? 'Quà tặng combo',
        products: (combo.items ?? []).map(gift => this.mapGiftProduct(gift)),
        selected: false,
      });
    }

    return choices;
  }

  private mapGiftProduct(gift: {productId: number; name: string; quantity: number; price: number}): ICartGiftDisplayProduct {
    return {
      productId: gift.productId,
      name: gift.name,
      image: 'assets/img/product-gift.png',
      quantity: gift.quantity,
      price: gift.price,
      priceOld: 0,
    };
  }

  private restoreChoiceSelection(next: ICartGiftChoice[], previous: ICartGiftChoice[]): ICartGiftChoice[] {
    const selectedIds = new Set(previous.filter(choice => choice.selected).map(choice => choice.id));
    return next.map(choice => ({...choice, selected: selectedIds.has(choice.id)}));
  }

  private selectSingleChoiceByRule(choices: ICartGiftChoice[], selected: ICartGiftChoice): ICartGiftChoice[] {
    return choices.map(choice => {
      if (choice.ruleId !== selected.ruleId) return choice;
      return {
        ...choice,
        selected: choice.id === selected.id ? !choice.selected : false,
      };
    });
  }

  private persistGiftDisplays(): void {
    const selections: Record<string, ICartGiftDisplayProduct[]> = {};

    for (const [productId, gifts] of Object.entries(this.productGiftsMap)) {
      if (gifts.length) selections[`product_${productId}`] = gifts;
    }

    if (this.billGifts.length) {
      selections['bill'] = this.billGifts;
    }

    this.cartService.setGiftSelections(selections);
  }

	 protected readonly uriFeConst = uriFeConst;
}
