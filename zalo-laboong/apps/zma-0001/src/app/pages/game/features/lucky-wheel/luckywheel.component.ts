import {Component, OnInit, ViewChild} from '@angular/core';
import {LuckyWheelComponent, WheelSegment} from '../../../../../../../../common/shared/components/game/lucky-wheel.component';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MockPromotionService} from '../../../../../../../../common/shared/services/feature-specific/promotion/mock-promotion.service';
import {PlayerInfo, PromoProgram} from '../../../../../../../../common/shared/models/feature-specific/promotion/promotion.models';
import {PlayerInfoService} from '../../../../../../../../common/shared/services/feature-specific/promotion/player-info.service';
import {AppCommonComponent} from '../../../../../../../../common/shared/components/app-common.service';
import {PrizeResultModalComponent} from '../../../../components/actions/prize-result-modal.component';
import {ModalCustomService} from '../../../../../../../../common/shared/services/global';

@Component({
  selector: 'app-luckywheel-page',
  templateUrl: 'luckywheel.component.html',
  styleUrls: ['luckywheel.component.scss'],
  standalone: false
})

export class LuckywheelComponent extends AppCommonComponent implements OnInit {
  @ViewChild('wheel') wheel?: LuckyWheelComponent;

  program?: PromoProgram;
  segments: WheelSegment[] = [];
  winnerId: string = '12121221'
  lastSpinId: string | null = null;
  spinning = false;

  form!: FormGroup;

  get hasPlayer() {
    return !!this.playerSer.get();
  }

  constructor(
    private fb: FormBuilder,
    private playerSer: PlayerInfoService,
    private promo: MockPromotionService,
    private _modalService: ModalCustomService
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: true, back: true, title: 'Vòng quay may mắn'});
    this.setFooter({variant: 'tabs', show: false});
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{9,11}$/)]],
      gender: ['male' as PlayerInfo['gender']]
    });

    const info = this.playerSer.get();
    if (info) this.form.patchValue(info);

    this.promo.getProgram$('demo-001').subscribe(p => {
      this.program = p;
      this.segments = (p.rewards || []).map(r => ({
        id: r.id,
        label: r.label,
        imageUrl: r.imageUrl,
        color: r.color,
        textColor: r.textColor,
        weight: r.weight
      }));
    });
  }

  onSpinClick() {
    if (!this.program) return;

    let info = this.playerSer.get();
    if (!info) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      info = this.form.value as PlayerInfo;
      this.playerSer.set(info);
    }

    this.spinning = true;

    this.promo.startSpin$(this.program.id).subscribe({
      next: res => {
        this.lastSpinId = res.spinId;
        this.winnerId = res.winnerId;
        this.program = {...this.program!, remainingSpins: res.remainingSpins};
        setTimeout(() => this.wheel?.spin(), 0);
      },
      error: () => this.spinning = false
    });
  }

  onSpinEnd(seg: WheelSegment) {
    if (!this.program || !this.lastSpinId) {
      this.spinning = false;
      return;
    }

    this.promo.confirmSpin$(this.program.id, this.lastSpinId).subscribe({
      next: (res: any) => {
        this.spinning = false;

        const ref = this._modalService.openIntro(PrizeResultModalComponent, {
          size: 'sm',
          centered: true,
          modalDialogClass: 'custom-modal-prize',
        });

        ref.componentInstance.prizeName = seg.label;
        ref.componentInstance.code =
          res?.code ?? res?.voucherCode ?? res?.claimCode ?? this.lastSpinId ?? null;

        ref.result?.then((action: string) => {
          if (action === 'inbox') {
          } else if (action === 'buy') {
          }
        }).catch(() => {});
      },
      error: () => {
        this.spinning = false;
      }
    });
  }
}
