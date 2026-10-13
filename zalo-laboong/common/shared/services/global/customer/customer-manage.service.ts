import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {IAddress, IAddressForm} from '@shared/models/global';
import {ZmaNativeStorageService} from '../../../../core/services';

@Injectable({providedIn: 'root'})
export class CustomerManageService {
  private static readonly KEY = 'customer:address';

  private sub = new BehaviorSubject<IAddress[]>(this.readFromStorage());

  constructor(private storage: ZmaNativeStorageService) {}

  add(form: IAddressForm, options: { forceDefaultIfFirst?: boolean } = {}): IAddress {
    const curr = [...this.readFromStorage()];
    let addr = this.formToAddress(form);
    const forceDefaultIfFirst = options.forceDefaultIfFirst ?? true;

    if (curr.length === 0 && forceDefaultIfFirst) {
      addr = { ...addr, isDefault: true };
    }
    const next = addr.isDefault
      ? [addr, ...curr.map(a => ({ ...a, isDefault: false }))]
      : [addr, ...curr];

    this.writeToStorage(next);
    return addr;
  }

  update(id: string, form: IAddressForm): IAddress | null {
    let list = [...this.readFromStorage()];
    const idx = list.findIndex(a => a.id === id);
    if (idx < 0) return null;

    const patch = this.formToAddress(form, id, list[idx].createdAt);

    if (patch.isDefault) {
      list = list.map(a => ({ ...a, isDefault: false }));
    } else if (list[idx].isDefault) {
      // nếu item cũ là mặc định mà form bỏ tick -> vẫn giữ mặc định cho item này
      patch.isDefault = true;
    }

    list[idx] = patch;
    this.writeToStorage(list);
    return patch;
  }

  /** Xoá địa chỉ */
  remove(id: string): void {
    const list = this.readFromStorage().filter(a => a.id !== id);
    this.writeToStorage(list);
  }

  /** Xoá tất cả địa chỉ */
  clear(): void {
    this.storage.remove(CustomerManageService.KEY);
    this.sub.next([]);
  }

  setDefault(id: string): void {
    const list = this.readFromStorage().map(a => ({ ...a, isDefault: a.id === id }));
    this.writeToStorage(list);
  }

  getAll(): IAddress[] {
    return this.readFromStorage();
  }

  hasAny(): boolean {
    return this.readFromStorage().length > 0;
  }

  getDefault(): IAddress | undefined {
    return this.readFromStorage().find(a => a.isDefault);
  }

  getById(id: string): IAddress | undefined {
    return this.readFromStorage().find(a => a.id === id);
  }

  private formToAddress(form: IAddressForm, keepId?: string, createdAt?: number): IAddress {
    const raw = form.getRawValue();
    const now = Date.now();

    return this.normalize({
      id: keepId ?? this.genId(),
      name: raw.name,
      mobile: raw.mobile,
      address: raw.address,
      isDefault: !!raw.isDefault,
      location: {
        cityId: Number(raw.location.cityId) || 0,
        districtId: Number(raw.location.districtId) || 0,
        wardId: Number(raw.location.wardId) || 0,
        cityName: (raw.location as any).cityName ?? '',
        districtName: (raw.location as any).districtName ?? '',
        wardName: (raw.location as any).wardName ?? ''
      },
      createdAt: createdAt ?? now,
      updatedAt: now
    });
  }

  private genId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private normalize(a: any): IAddress {
    return {
      id: String(a?.id || this.genId()),
      name: String(a?.name || '').trim(),
      mobile: String(a?.mobile || '').trim(),
      address: String(a?.address || '').trim(),
      isDefault: !!a?.isDefault,
      location: {
        cityId: Number(a?.location?.cityId) || 0,
        districtId: Number(a?.location?.districtId) || 0,
        wardId: Number(a?.location?.wardId) || 0,
        cityName: String(a?.location?.cityName || ''),
        districtName: String(a?.location?.districtName || ''),
        wardName: String(a?.location?.wardName || '')
      },
      createdAt: Number(a?.createdAt) || Date.now(),
      updatedAt: Number(a?.updatedAt) || Date.now()
    };
  }

  private readFromStorage(): IAddress[] {
    try {
      const raw = this.storage.get<IAddress[]>(CustomerManageService.KEY, [] as any);
      return Array.isArray(raw) ? raw.map(this.normalize) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(list: IAddress[]): void {
    this.storage.set(CustomerManageService.KEY, list);
    this.sub.next(list);
  }
}
