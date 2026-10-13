import { Injectable } from '@angular/core';
import {PlayerInfo} from '../../../models/feature-specific/promotion/promotion.models';

const KEY = 'wheel:player';

@Injectable({ providedIn: 'root' })
export class PlayerInfoService {
  get(): PlayerInfo | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) as PlayerInfo : null;
    } catch { return null; }
  }
  set(info: PlayerInfo) { localStorage.setItem(KEY, JSON.stringify(info)); }
  hasInfo(): boolean { return !!this.get(); }
}
