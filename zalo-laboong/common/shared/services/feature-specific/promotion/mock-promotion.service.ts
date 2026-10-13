import {inject, Injectable} from '@angular/core';
import {Observable, of, delay, from, catchError, map, defer, finalize} from 'rxjs';
import {
  PlayerInfo,
  PromoProgram,
  PromoReward, SpinConfirmResponse,
  SpinStartResponse
} from '../../../models/feature-specific/promotion/promotion.models';
import {ZmaNativeStorageService} from '../../../../core/services';
import {getUserID} from 'zmp-sdk/apis';
import {switchMap, tap} from 'rxjs/operators';

function id(prefix='spin'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

const MOCK_REWARDS: PromoReward[] = [
  { id: 'r-20k',  label: '20K',   imageUrl: '', color: '#F9C74F', textColor:'#1b1b1b', weight: 93, voucherCode: 'SALE20K' },

  { id: 'r-giay', label: 'Giày',
    imageUrl: 'https://poscdn.nvndev.net/573748-35253/ps/sp-test-no-active--1.png?v=1762701602',
    weight: 1
  },
  { id: 'r-tui',  label: 'Túi',
    imageUrl: 'https://poscdn.nvndev.net/573748-35253/ps/sp-test-no-active--2.png?v=1762701822',
    weight: 1
  },
  { id: 'r-tat',  label: 'Tất nữ',
    imageUrl: 'https://poscdn.nvndev.net/573748-35253/ps/sp-test-no-active--3.png?v=1762701849',
    weight: 1
  },

  { id: 'r-50k',  label: '50K',   imageUrl: '', color:'#F94144', textColor:'#fff', weight: 2, voucherCode: 'SALE50K' },

  { id: 'r-vong', label: 'Vòng vàng',
    imageUrl: 'https://poscdn.nvndev.net/573748-35253/ps/sp-test-no-active--4.png?v=1762701851',
    weight: 1
  },

  { id: 'r-100k', label: '100K',  imageUrl: '', weight: 1, voucherCode: 'SALE100K' },
];

@Injectable({ providedIn: 'root' })
export class MockPromotionService {
  private zmpStorage = inject(ZmaNativeStorageService);
  private program: PromoProgram = {
    id: 'demo-001',
    name: 'Vòng quay may mắn',
    primaryColor: '#0b2e69',
    remainingSpins: 3,
    rewards: MOCK_REWARDS
  };

  private lastSpin?: { spinId: string; winnerId: string };

  getProgram$(id: string): Observable<PromoProgram> {
    return of({ ...this.program }).pipe(delay(300));
  }

  startSpin$(programId: string): Observable<SpinStartResponse> {
    if (this.program.remainingSpins <= 0) {

    }

    const rewards = this.program.rewards ?? [];
    const total = rewards.reduce((s, r) => s + (r.weight ?? 1), 0);
    let r = Math.random() * total;
    let winner = rewards[0];
    for (const it of rewards) {
      r -= (it.weight ?? 1);
      if (r <= 0) { winner = it; break; }
    }

    const spinId = id();
    this.lastSpin = { spinId, winnerId: winner.id };
    this.program = { ...this.program, remainingSpins: Math.max(0, this.program.remainingSpins - 1) };

    return of({
      spinId,
      winnerId: winner.id,
      remainingSpins: this.program.remainingSpins
    }).pipe(delay(400));
  }

  confirmSpin$(programId: string, spinId: string): Observable<SpinConfirmResponse> {
    const ok = !!this.lastSpin && this.lastSpin.spinId === spinId;
    const reward = ok ? this.program.rewards.find(r => r.id === this.lastSpin!.winnerId) : undefined;

    const code: 0 | 1 = ok ? 1 : 0;
    const resp: SpinConfirmResponse = {
      code,
      message: ok ? 'OK' : 'Spin không hợp lệ',
      rewardDetail: reward ? { id: reward.id, label: reward.label, voucherCode: reward.voucherCode } : null
    };

    return of(resp).pipe(delay(250));
  }

  // set Voucher
  // Hàm dùng để lưu voucher sau khi thắng game => logic này là tạm thời, do chơi có api liên quan
  setVoucher(value: { voucherCode: string }): Observable<void> {
    return defer(() => {
      try {
        return from((getUserID as any)());
      } catch {
        return of('Guest');
      }
    }).pipe(
      catchError(() => of('Guest')),
      map(id => (id ? String(id) : 'Guest')),
      tap(uid => {
        const key = `voucher:${uid}:data`;
        const current: { voucherCode: string }[] = this.zmpStorage.get(key) || [];
        this.zmpStorage.set(key, [...current, value]);
      }),
      map(() => void 0)
    );
  }
  getVoucher<T = any>() {
    return from(getUserID()).pipe(
      catchError(() => of('Guest')),
      map(id => id || 'Guest'),
      map(uid => this.zmpStorage.get<T | null>(`voucher:${uid}:data`, null))
    );
  }

  removeVoucher(code: string, removeAll = false): Observable<void> {
    const norm = (s: any) => String(s || '').trim().toUpperCase();

    return from(getUserID()).pipe(
      catchError(() => of('Guest')),
      map(id => (id ? String(id) : 'Guest')),
      tap(uid => {
        const key = `voucher:${uid}:data`;
        const list: Array<{ voucherCode: string }> = this.zmpStorage.get(key) || [];
        if (!Array.isArray(list) || list.length === 0) return;

        const target = norm(code);

        let updated = list.slice();
        if (removeAll) {
          updated = updated.filter(v => norm(v && v.voucherCode) !== target);
        } else {
          const idx = updated.findIndex(v => norm(v && v.voucherCode) === target);
          if (idx >= 0) updated.splice(idx, 1);
        }

        this.zmpStorage.set(key, updated);
      }),
      map(() => void 0)
    );
  }
}
