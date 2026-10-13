import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GiftPickerMode, IGiftDisplayChoice } from '../cart-flow.models';

@Component({
  selector: 'app-cart-flow-gift-picker',
  standalone: false,
  templateUrl: './cart-flow-gift-picker.component.html',
  styleUrls: ['./cart-flow-gift-picker.component.scss'],
})
export class CartFlowGiftPickerComponent {
  @Input() choices: IGiftDisplayChoice[] = [];
  @Input() mode: GiftPickerMode = 'single';
  @Input() maxSelections = 1;

  @Output() complete = new EventEmitter<IGiftDisplayChoice[]>();

  get selectedCount(): number {
    return this.choices.filter(c => c.selected).length;
  }

  toggleChoice(choice: IGiftDisplayChoice, event?: Event): void {
    this.consumeInteraction(event);
    if (choice.disabled) return;

    // Per-rule single selection: only 1 choice per ruleId
    const sameRuleChoices = this.choices.filter(c => c.ruleId === choice.ruleId);
    if (sameRuleChoices.length > 1) {
      for (const c of sameRuleChoices) {
        c.selected = c.id === choice.id ? !c.selected : false;
      }
      return;
    }

    // Single item in rule — toggle directly
    choice.selected = !choice.selected;
  }

  onComplete(event?: Event): void {
    this.consumeInteraction(event);
    this.complete.emit(this.choices.filter(c => c.selected));
  }

  stopEventPropagation(event: Event): void {
    event.stopPropagation();
  }

  formatPrice(price: number): string {
    return (price ?? 0).toLocaleString('vi-VN') + ' VND';
  }

  private consumeInteraction(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
  }
}
