import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {AppFormAddService} from '@shared/services/global/app-form-add.service';
import {takeUntil} from 'rxjs';
import {AppService, NotifyService, ZmaNativeStorageService} from '@core/services';
import {FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {NgClass} from '@angular/common';
import {ModalCustomService} from '@shared/services/global';
import {FollowOAService} from '@shared/components/follow-oa';

const VN_PHONE = /^(?:\+?84|0)(?:[3|5|7|8|9])\d{8}$/;

@Component({
  selector: 'app-game-box',
  templateUrl: 'game-box.component.html',
  styleUrls: ['game-box.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgClass
  ],
  standalone: true
})

export class GameBoxComponent implements OnInit, OnDestroy {
  @Input() oaId = '';
  @Input() step = 1;
  @Output() stepChange = new EventEmitter<number>();

  form!: any
  errorMsg = '';

  constructor(
    public appFm: AppFormAddService,
    private appService: AppService,
    public active: ModalCustomService,
    private followOA: FollowOAService,
    private notify: NotifyService,
    private zmaStorage: ZmaNativeStorageService,
  ) {
  }

  ngOnInit() {
    // Check nếu user đã follow OA rồi thì sẽ qua step 2 luôn
    if(this.appService.getUserInfo && this.appService.getUserInfo.followedOA == true) {
      this.step = 2;
    }

    if(this.step === 2) {
      this.form = this.appFm.createForm({
        name: ['', Validators.required],
        mobile: ['', [Validators.required, Validators.pattern(VN_PHONE)]],
        email: ['']
      })
    }
  }

  ngOnDestroy() {
    this.appFm.getDestroySubs();
  }

  private setStep(s: number): void {
    if (this.step !== s) {
      this.step = s;
      this.stepChange.emit(this.step);
    }
  }

  showError(ctrlPath: string): boolean {
    const c = this.form.get(ctrlPath);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  getError(ctrlPath: string): string | null {
    const c = this.form.get(ctrlPath);
    if (!c || !(c.touched || c.dirty) || !c.errors) return null;

    if (c.errors['required']) return 'Bạn chưa điền đủ thông tin';
    if (ctrlPath === 'mobile' && c.errors['pattern']) return 'Số điện thoại không hợp lệ';
    if (ctrlPath === 'email' && c.errors['email']) return 'Email không hợp lệ';
    return null;
  }

  onSubmit() {
    if (!this.appFm.submitFromHandle(this.form)) return;

    this.zmaStorage.set('userInfoGame:data', this.form.value); // Lưu thông tin user
    this.active.dismissAll(true)
  }

  onStartFollow(): void {
    this.errorMsg = '';

    this.followOA.onFollowOA()
      .pipe(takeUntil(this.appFm.destroyed))
      .subscribe((status) => {
        if (status === 'already' || status === 'followed') {
          this.setStep(2);
          return this.notify.success('Theo dõi thành công!')
        }
      });
  }

  onClose() {
    this.active.dismissAll(false)
  }
}
