import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { AppCommonComponent } from '@shared/components/app-common.service';
import {uriFeConst} from '../../../../../../../common/shared/constants';
import {NgbActiveModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'app-community-modal',
  templateUrl: './community-modal.component.html',
  styleUrls: ['./community-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CommunityComponent extends AppCommonComponent implements OnInit, OnDestroy {
  constructor(
    public activeModal: NgbActiveModal,
  ) {
    super();
  }
  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    this.getDestroySubs();
  }

  protected readonly uriFeConst = uriFeConst;
}
