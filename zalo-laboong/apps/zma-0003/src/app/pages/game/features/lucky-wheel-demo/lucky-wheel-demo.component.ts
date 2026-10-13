import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AppCommonComponent} from '@shared/components/app-common.service';
import {ZmaNativeStorageService} from '@core/services';
import {FormGroup} from '@angular/forms';
import {PromoProgram} from '@shared/models/feature-specific/promotion/promotion.models';
import {finalize, fromEvent, take, takeUntil} from 'rxjs';
import {ModalCustomService} from '@shared/services/global';
import {GameBoxComponent} from '@shared/components/modals/game-box/game-box.component';
import {LuckyWheelComponent, WheelSegment} from '@shared/components/game/lucky-wheel.component';
import {PrizeResultModalComponent} from '../../../../components/actions/prize-result-modal.component';
import {MockPromotionService} from '@shared/services/feature-specific/promotion/mock-promotion.service';
import {environment} from '../../../../../environments';
import {openChat} from 'zmp-sdk/apis';
import {uriFeConst} from '@shared/constants';
import {PromotionApiService} from '@shared/services/api/promotion/promotion-api.service';

type Step = 1 | 2;
type UserInfoGame = {
  name: string;
  mobile?: string;
  email?: string;
  musicOn?: boolean;
};
const KEY_USER = 'userInfoGame:data';

@Component({
  selector: 'app-lucky-wheel-demo',
  templateUrl: 'lucky-wheel-demo.component.html',
  styleUrls: ['lucky-wheel-demo.component.scss'],
  standalone: false
})

export class LuckyWheelDemoComponent extends AppCommonComponent implements OnInit, OnDestroy {
  @ViewChild('wheel') wheel?: LuckyWheelComponent;
  form!: FormGroup;
  spinDurationSec = 0; //Thời gian hoàn thành vòng quay
  private snd = new Audio('assets/audio/Am_thanh_vong_quay_may_man_ngan-www_tiengdong_com.mp3');
  private audioReady = false;

  musicOn = true;
  public bgm = new Audio('https://res.cloudinary.com/dxy2muzyb/video/upload/v1762749856/christmas-background-music-179637_hambvn.mp3');
  KEY_USER = 'userInfoGame:data';

  // --- state hiển thị
  step: Step = 1;
  countSpin = 0; // Số lượt chơi


  // state step 2
  program?: PromoProgram;
  segments: WheelSegment[] = [];
  winnerId: string = '12121221'
  lastSpinId: string | null = null;
  spinning = false;

  constructor(
    private promotionApi: PromotionApiService,
    private modalService: ModalCustomService,
    private promo: MockPromotionService,
    private _modalService: ModalCustomService,
    private zmaStorage: ZmaNativeStorageService,
  ) {
    super();
  }

  ngOnInit() {
    this.setHeader({variant: 'title', show: false, back: true, title: ''});
    this.setFooter({variant: 'tabs', show: false});

    // setup audio
    this.bgm.loop = true;
    this.bgm.preload = 'auto';
    this.bgm.volume = 0.6;
    const user = this.readUserInfo();
    if (typeof user.musicOn === 'boolean') {
      this.musicOn = user.musicOn;
    }

    if (this.musicOn) {
      this.bgm.play().catch(() => {
        fromEvent<PointerEvent>(document, 'pointerdown')
          .pipe(take(1), takeUntil(this.destroyed))
          .subscribe(() => {
            this.bgm.play().catch(() => {});
          });
      });
    }
    // setup audio spin
    this.snd.preload = 'auto';
    this.snd.addEventListener('loadedmetadata', () => {
      this.spinDurationSec = Math.max(2, Math.min(12, this.snd.duration || 4.5)) + 0.6;
    });

    // Check nếu user có isHaveFollow = true thì sẽ set countSpin = 0
    // => logic demo hiện tại chỉ hỗ trợ tặng lượt chơi qua việc follow OA, nên mỗi user chỉ có 1 lượt chơi duy nhất.
    if(this.appService.getUserInfo && this.appService.getUserInfo.isHaveFollow) {
      this.countSpin = 0;
    }

    this.spinner.show()
    this.promotionApi.getGameInfo({id: '168'})
      .pipe(takeUntil(this.destroyed), finalize(() => this.spinner.hide()))
      .subscribe({
        next: res => {
          console.log(res)
        }
      })

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

  ngOnDestroy() {
    this.getDestroySubs();
    this.bgm.pause();
  }

  openGame(step: number) {
    const dataUser = (this.zmaStorage.get('userInfoGame:data') as Partial<{ name: string }>) ?? {};
    const isFollowOA = !!this.appService.getUserInfo?.followedOA;
    const isSubmitForm = !!dataUser.name;

    if (this.step === 1 && isFollowOA && isSubmitForm) {
      this.step = 2;
      return;
    }

    if (step === 1) {
      const ref = this.modalService.openIntro(GameBoxComponent, {size: 'sm', centered: true});

      ref.componentInstance.oaId = environment.OAId;
      ref.dismissed.subscribe({
        next: res => {
          if(!res) return;

          this.countSpin = 1; // Tặng user 1 lượt chơi khi follow OA và nhập đủ thông tin user
          this.step = 2
        }
      })
    }
  }

  openRules() {

  }

  openGifts() {
    this.navService.redirect([uriFeConst.user.voucher])
  }

  onSpinClick() {
    if (!this.program) return;

    if (!this.countSpin) {
      return this.notifyService.warning('Bạn đã hết lượt quay');
    }

    this.spinning = true;
    this.snd.play().finally()
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
        // this.snd.pause()
        this.countSpin = 0;
        this.userService.updateIsHaveFollow(true); // Cập nhật isHaveFollow


        const ref = this._modalService.openIntro(PrizeResultModalComponent, {
          size: 'sm',
          centered: true,
          modalDialogClass: 'custom-modal-prize',
        });

        ref.componentInstance.prizeName = seg.label;
        ref.componentInstance.code = res.code === 1 ? res.rewardDetail.voucherCode : ''

        this.promo.setVoucher({ voucherCode: res.rewardDetail.voucherCode }).subscribe(); // Lưu voucher cho user win game

        ref.closed.subscribe({
          next: res => {
            if (res === 'inbox') {
              openChat({type: 'oa', id: '762755468038541624', message: 'Xin chào'});
            } else if (res === 'buy') {
              this.navService.redirect([uriFeConst.product.category]);
            }
          }
        })
      },
      error: () => {
        this.spinning = false;
      }
    });
  }

  // Hàm dùng để reset lại isHaveFollow => chỉ dùng để test trên zalo app
  isReset() {
    this.userService.updateIsHaveFollow(false);
    this.countSpin = 1;

    setTimeout(() => {
    }, 1000)
  }

  toggleMusic() {
    if (this.musicOn) {
      this.bgm.pause();
      this.musicOn = false;
      this.saveMusicPref(false);
    } else {
      this.bgm.play()
        .then(() => {
          this.musicOn = true;
          this.saveMusicPref(true);
        })
        .catch(() => {
          fromEvent<PointerEvent>(document, 'pointerdown')
            .pipe(take(1), takeUntil(this.destroyed))
            .subscribe(() => {
              this.bgm.play().then(() => {
                this.musicOn = true;
                this.saveMusicPref(true);
              }).catch(() => {});
            });
        });
    }
  }

  private readUserInfo(): UserInfoGame {
    return this.zmaStorage.get<UserInfoGame>(KEY_USER, { name: '' });
  }

  private saveMusicPref(on: boolean): void {
    const cur = this.readUserInfo();
    const next: UserInfoGame = { ...cur, musicOn: on };
    this.zmaStorage.set(KEY_USER, next);
  }

  protected readonly environment = environment;
}
