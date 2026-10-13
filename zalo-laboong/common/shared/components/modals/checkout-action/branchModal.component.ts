import { Component, Input, ChangeDetectorRef, OnInit } from '@angular/core';
import { NgbActiveOffcanvas } from '@ng-bootstrap/ng-bootstrap';

export interface IResBranch {
  id: number;
  name: string;
  address: string;
}
@Component({
  selector: 'app-branch-offcanvas',
  standalone: false,
  template: `
    <div class="offcanvas-body p-0">
      <h5 class="text-center fw-semibold py-3 border-bottom mb-0">
        Chọn chi nhánh
      </h5>

      <div class="branch-list">
        @for (b of _branches; track b.id) {
          <div
            class="branch-item"
            [class.active]="b.id === _activeId"
            (click)="onSelect(b)">
            <div class="branch-info">
              <p class="fw-semibold mb-1">{{ b.name }}</p>
              <p class="text-muted mb-0 small">{{ b.address }}</p>
            </div>

            <input
              type="checkbox"
              class="form-check-input"
              [checked]="b.id === _activeId"
              (click)="$event.stopPropagation(); onSelect(b)"
            />
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .branch-list {
      background: #fff;
      padding: 0 12px;
      max-height: 60vh;
      overflow-y: auto;
    }
    .branch-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 4px;
      cursor: pointer;
    }
    .branch-item.active {
      background: #f8f9fa;
      border-radius: 8px;
    }
  `]
})
export class BranchOffcanvasComponent implements OnInit {
  _branches: IResBranch[] = [];
  _activeId: number | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private activeOffcanvas: NgbActiveOffcanvas
  ) {}

  @Input() set branches(value: IResBranch[]) {
    this._branches = value ?? [];
    this.cdr.markForCheck();
  }

  @Input() set activeId(value: number | null) {
    this._activeId = value == null ? null : Number(value);
    this.cdr.markForCheck();
  }
  ngOnInit() {}

  onSelect(branch: IResBranch) {
    this._activeId = branch.id;
    this.activeOffcanvas.close(branch); // Trả kết quả về parent
  }
}
