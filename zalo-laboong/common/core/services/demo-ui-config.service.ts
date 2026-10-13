import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IZmaBaseTemplateConfig } from 'common/shared/templates'; // alias của bạn

@Injectable({ providedIn: 'root' })
export class DemoUiConfigService {
  private activeTemplateSub = new BehaviorSubject<IZmaBaseTemplateConfig | null>(null);
  activeTemplate$ = this.activeTemplateSub.asObservable();

  setActiveTemplate(template: IZmaBaseTemplateConfig | null): void {
    this.activeTemplateSub.next(template);
  }

  get activeTemplate(): IZmaBaseTemplateConfig | null {
    return this.activeTemplateSub.value;
  }
}
