import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ICartFlowItem } from '../cart-flow.models';

@Component({
  selector: 'app-cart-flow-item',
  standalone: false,
  templateUrl: './cart-flow-item.component.html',
  styleUrls: ['./cart-flow-item.component.scss'],
})
export class CartFlowItemComponent {
  @Input() item!: ICartFlowItem;
  @Input() swiped = false;

  @Output() toggle = new EventEmitter<void>();
  @Output() quantityChange = new EventEmitter<number>();
  @Output() swipeOpen = new EventEmitter<number>();
  @Output() swipeClose = new EventEmitter<void>();
  @Output() requestDelete = new EventEmitter<ICartFlowItem>();
  @Output() openGiftPicker = new EventEmitter<number>();

  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeActive = false;

  onPointerDown(event: PointerEvent): void {
    if (this.isInteractiveTarget(event)) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.swipeActive = true;
    this.swipeStartX = event.clientX;
    this.swipeStartY = event.clientY;
    if (!this.swiped) {
      this.swipeClose.emit();
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.swipeActive) return;

    const dx = event.clientX - this.swipeStartX;
    const dy = event.clientY - this.swipeStartY;

    if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy)) return;

    event.preventDefault();
    if (dx < -24) {
      this.swipeOpen.emit(this.item.productId);
    } else if (dx > 16 && this.swiped) {
      this.swipeClose.emit();
    }
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.swipeActive) return;

    const draggedLeft = this.swipeStartX - event.clientX;
    const draggedRight = event.clientX - this.swipeStartX;

    if (draggedLeft > 40) {
      this.swipeOpen.emit(this.item.productId);
    } else if (draggedRight > 16) {
      this.swipeClose.emit();
    }

    this.swipeActive = false;
  }

  onPointerCancel(): void {
    this.swipeActive = false;
  }

  stopEventPropagation(event: Event): void {
    event.stopPropagation();
  }

  onToggle(event: Event): void {
    this.consumeInteraction(event);
    this.toggle.emit();
  }

  onQuantityChange(delta: number, event: Event): void {
    this.consumeInteraction(event);
    this.quantityChange.emit(delta);
  }

  onRequestDelete(event: Event): void {
    this.consumeInteraction(event);
    this.requestDelete.emit(this.item);
  }

  onOpenGiftPicker(event: Event): void {
    this.consumeInteraction(event);
    this.openGiftPicker.emit(this.item.productId);
  }

  formatPrice(price: number): string {
    return (price ?? 0).toLocaleString('vi-VN') + ' VND';
  }

  private consumeInteraction(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private isInteractiveTarget(event: Event): boolean {
    const target = event.target as HTMLElement | null;
    return !!target?.closest('button, a, input, textarea, select');
  }
}
