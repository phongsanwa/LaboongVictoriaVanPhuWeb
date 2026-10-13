import {
  Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild
} from '@angular/core';
import {FormControl} from '@angular/forms';
import {Subscription} from 'rxjs';
import {InputNumber} from 'primeng/inputnumber';

@Component({
  standalone: false,
  selector: 'app-auto-numeric',
  template: `
    @if (!useOnlyInput) {
      <div class="input-group custom-input-group {{ classBox }}"
           [ngClass]="{ 'iconLeft': !!classIconLeft, 'iconRight': !!classIconRight }">
        <ng-content select=".contentLeft"></ng-content>

        @if (classIconLeft) {
          <div class="input-group-text cursor-pointer">
            <i [class]="classIconLeft"></i>
          </div>
        }

        <ng-container *ngTemplateOutlet="inputTemplate"></ng-container>

        @if (classIconRight) {
          <div class="input-group-text cursor-pointer">
            <i [class]="classIconRight"></i>
          </div>
        }

        <ng-content select=".contentRight"></ng-content>
      </div>
    } @else {
      <ng-container *ngTemplateOutlet="inputTemplate"></ng-container>
    }

    <ng-template #inputTemplate>
      <div class="auto-num-wrapper"
           [ngClass]="buttonChangeLayout === 'vertical' ? 'layout-vertical' : 'layout-horizontal'">

        <!-- NÚT GIẢM -->
        @if (showButtonChange) {
          <button type="button"
                  class="btn-spin btn-spin-dec"
                  (click)="onSpin(-1, $event)">
            <i class="ph-light ph-minus"></i>
          </button>
        }

      <p-floatlabel variant="on" class="w-100 form-floating">
        <p-inputNumber
          class="app-auto-numeric form-control {{ classInput }}"
          [style]="styleClass"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readOnly"
          [styleClass]="styleClass"
          [inputStyle]="ngStyleInput"
          [(ngModel)]="value"
          (ngModelChange)="onInputChange($event)"
          (onBlur)="handleBlur()"
          (onFocus)="handleFocus()"
          [locale]="locale"
          [min]="minValue"
          [max]="999999999999.9"
          [useGrouping]="true"
          [format]="true"
          [showButtons]="false"
          buttonLayout="{{buttonChangeLayout}}">

<!--          @if (showButtonChange) {-->
<!--            <ng-template #decrementbuttonicon>-->
<!--              <i class="ph-light ph-minus"></i>-->
<!--            </ng-template>-->
<!--            <ng-template #incrementbuttonicon>-->
<!--              <i class="ph-light ph-plus"></i>-->
<!--            </ng-template>-->
<!--          }-->
        </p-inputNumber>

        @if (label) {
          <label>
            {{ label }}
            @if (required) {
              <span class="text-danger">(*)</span>
            }
          </label>
        }
      </p-floatlabel>

        @if (showButtonChange) {
          <button type="button"
                  class="btn-spin btn-spin-inc"
                  (click)="onSpin(1, $event)">
            <i class="ph-light ph-plus"></i>
          </button>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    p-inputnumber.form-control {
      padding: 0;
      border: none;
    }

    ::ng-deep .p-inputnumber-decrement-button, ::ng-deep .p-inputnumber-increment-button {
      width: auto !important;
      padding: 0 10px !important;
      background: #f3f4f6 !important;
    }

    ::ng-deep .app-auto-numeric input::placeholder {
      font-size: 0.9rem;
    }

    ::ng-deep .app-auto-numeric input {
      text-align: right;
    }

    ::ng-deep .app-auto-numeric .p-inputtext:enabled:hover {
      border-color: #0c83ff;
    }

    ::ng-deep .app-auto-numeric .p-inputtext:enabled:focus {
      box-shadow: 0 0 0 0 transparent, 0 0 0 .125rem #7b7b7f1a;
      border-color: #0c83ff;
    }

    .inputQtt {
      height: 35px;
    }

    .inputQttSmaller {
      height: 36px;
    }

    .custom-input-group {
      display: flex;
      flex-wrap: nowrap;
      width: 100%;
    }

    /* Xóa border-radius nếu có icon */
    .iconLeft ::ng-deep p-floatlabel .app-auto-numeric input,
    .contentLeft ::ng-deep p-floatlabel .app-auto-numeric input {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .iconRight ::ng-deep p-floatlabel .app-auto-numeric input,
    .contentRight ::ng-deep p-floatlabel .app-auto-numeric input {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    select:focus-visible {
      outline: none;
    }

    .form-floating > .form-control:not(:placeholder-shown) {
      padding: 0;
      background: transparent;
    }

    .custome .p-floatlabel {
      background: red;
    }

    .auto-num-wrapper {
      display: flex;
      align-items: stretch;
      width: 100%;
    }

    .auto-num-wrapper.layout-horizontal {
      flex-direction: row;
    }

    .auto-num-wrapper.layout-vertical {
      flex-direction: column;
    }

    .btn-spin {
      border: 1px solid #d1d5db;
      background: #f3f4f6;
      padding: 0 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;

      & i {
        color: #000000;
      }
    }

    .btn-spin-dec {
      border-radius: 0.375rem 0 0 0.375rem; /* left rounded */
    }

    .btn-spin-inc {
      border-radius: 0 0.375rem 0.375rem 0; /* right rounded */
    }

    .auto-num-wrapper.layout-vertical .btn-spin-dec,
    .auto-num-wrapper.layout-vertical .btn-spin-inc {
      border-radius: 0; /* nếu muốn style riêng cho vertical */
    }
  `]
})
export class AutoNumericComponent implements OnInit, OnDestroy, OnChanges {
  @Input() ngStyleInput: any;
  @Input() useOnlyInput = true;
  @Input() disabled!: boolean;
  @Input() classBox = '';
  @Input() classIconLeft = '';
  @Input() classIconRight = '';
  @Input() classInput = '';
  @Input() label = '';
  @Input() required = false;
  @Input() numberControl?: FormControl;
  @Input() value!: any;
  @Input() width!: string;
  @Input() readOnly = false;
  @Input() placeholder = '';
  @Input() styleClass = '';
  @Input() style: any;
  @Input() dataSelect: Array<{ label: string; value: any }> = [];
  @Input() showButtonChange = false;
  @Input() buttonChangeLayout: 'horizontal' | 'vertical' = 'horizontal';
  @Input() minValue = 1;

  @Input() locale: string = 'vi-VN';

  @Output() valueChange = new EventEmitter<any>();
  private valSubscription?: Subscription;

  @Input() step = 1; // nếu muốn cấu hình bước nhảy
  @ViewChild('pNum') pNum!: InputNumber;
  private lastValidValue: number | null = null;
  private focusValue: number | null = null;
  constructor() {
  }

  ngOnInit() {
    if (this.numberControl) {
      const initialValue = this.numberControl.value;
      if (!this.isEmpty(initialValue)) {
        this.value = initialValue;
      }
      this.valSubscription = this.numberControl.valueChanges.subscribe(v => {
        if (v !== this.value) this.value = v;
      });
      if (!this.isEmpty(initialValue)) {
        this.lastValidValue = Number(initialValue);
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && this.numberControl) {
      if (changes['disabled'].currentValue) {
        this.numberControl.disable({emitEvent: false});
      } else {
        this.numberControl.enable({emitEvent: false});
      }
    }
  }

  ngOnDestroy() {
    this.valSubscription?.unsubscribe();
  }

  onSpin(direction: 1 | -1, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const current = Number(this.value) || 0;
    const next = current + direction * this.step;

    // áp min / max
    const clamped = Math.min(Math.max(next, this.minValue), 999999999999.9);

    this.value = clamped;
    this.valueChange.emit(this.value);

    // đảm bảo không focus input (phòng trường hợp có browser lạ)
    if (this.pNum?.input?.nativeElement) {
      this.pNum.input.nativeElement.blur();
    }
  }

  onInputChange(eventValue: any) {
    // user đang xoá input
    if (this.isEmpty(eventValue)) {
      this.value = null;
      return;
    }
    let numericValue: number | null = null;
    const parsed = Number(eventValue);
    numericValue = Number.isNaN(parsed)
      ? null
      : parsed;
    if (numericValue !== null && numericValue < this.minValue) {
      numericValue = this.minValue;
    }
    this.value = numericValue;
    // lưu giá trị hợp lệ gần nhất
    if (numericValue !== null) {
      this.lastValidValue = numericValue;
    }
    if (this.numberControl && this.numberControl.value !== this.value) {
      this.numberControl.setValue(this.value, {
        emitEvent: true
      });
    }
    this.valueChange.emit(this.value);
  }

  handleFocus() {
    this.focusValue = this.value;
  }

  handleBlur() {
    // user xoá sạch input
    if (this.isEmpty(this.value)) {
      // trả về giá trị lúc bắt đầu focus
      this.value = this.focusValue ?? this.minValue;
      if (this.numberControl && this.numberControl.value !== this.value) {
        this.numberControl.setValue(this.value, {
          emitEvent: true
        });
      }
      this.valueChange.emit(this.value);
    }
  }

  private isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '';
  }
}
