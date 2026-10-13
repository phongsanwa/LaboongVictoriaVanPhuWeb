import {Component, inject, OnInit} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {FormBuilder, Validators} from '@angular/forms';
import {IUserFeedBackRequestParams} from '@shared/models/global';
import {UserApiService} from '@shared/services/api/user/user-api.service';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
  standalone: false,
})

export class FeedbackComponent extends AppCommonComponent implements OnInit {
  private userApi = inject(UserApiService);
  private fb = inject(FormBuilder);
  feedbackForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    mobile: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    address: ['', Validators.required],
    content: ['', Validators.required],
  });

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Phản hồi cho chúng tôi'});
    this.setFooter({variant: 'tabs', show: false});
  }

  isInvalid(controlName: string): boolean {
    const control = this.feedbackForm.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  onSubmit() {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    const params = this.feedbackForm.getRawValue() as IUserFeedBackRequestParams;

    this.userApi.sendFeedback(params).subscribe({
      next: (res) => {
        if (res.code === 1) {
          this.notifyService.success('Gửi phản hồi thành công!');
          this.feedbackForm.reset();
        } else {
          this.notifyService.error('Gửi phản hồi thất bại');
        }
      },
      error: (err) => {
        this.notifyService.error('Không thể gửi phản hồi, vui lòng thử lại sau');
        console.error(err);
      },
    });
  }
}
