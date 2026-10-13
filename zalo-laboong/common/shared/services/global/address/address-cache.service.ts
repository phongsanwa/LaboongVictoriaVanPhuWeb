import {Injectable} from '@angular/core';
import {Observable, from, of} from 'rxjs';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {getDeviceIdAsync} from 'zmp-sdk/apis';
import {AddressApiService} from '../../api/address/address-api.service';
import {
  IAddressItem,
  IAddressVersion,
  ICreateAddressParams,
  IDeleteAddressParams,
  ISetDefaultAddressParams,
  IUpdateAddressParams,
} from '@shared/models/api';
import {IResponseApi} from '@core/models';
import {UserService} from '@core/services';

/** Cấu trúc cache lưu trong localStorage, key theo webAppUserId */
interface IAddressCacheData {
  deviceId: string;
  version: { maxUpdatedAt: number; total: number };
  addresses: IAddressItem[];
}

@Injectable({
  providedIn: 'root',
})
export class AddressCacheService {
  private readonly STORAGE_PREFIX = 'address_cache_';

  constructor(
    private addressApi: AddressApiService,
    private userService: UserService
  ) {
  }

  /**
   * Lấy danh sách địa chỉ theo luồng quyết định mục 5.4:
   * - Không có cache (theo webAppUserId) -> gọi API list -> lưu cache
   * - Có cache nhưng deviceId khác -> gọi API list -> cập nhật cache
   * - deviceId trùng -> gọi API version, version khác -> gọi list, version trùng -> dùng local
   *
   * @param forceReload  bỏ qua cache, luôn gọi API list mới nhất
   */
  getAddressList(forceReload = false): Observable<IAddressItem[]> {
    return from(this.getCurrentDeviceId()).pipe(
      switchMap((deviceId) => {
        const cached = this.readCache();

        if (forceReload || !cached) {
          return this.fetchAndCache(deviceId);
        }

        if (cached.deviceId !== deviceId) {
          // Đổi máy -> tải lại list, cập nhật cache theo deviceId mới
          return this.fetchAndCache(deviceId);
        }

        // Cùng máy -> kiểm tra version trước khi quyết định tải list
        return this.addressApi.addressVersion({deviceId}).pipe(
          switchMap((res: any) => {
            const remoteVersion = res?.data;
            const isSame =
              remoteVersion &&
              remoteVersion.maxUpdatedAt === cached.version?.maxUpdatedAt &&
              remoteVersion.total === cached.version?.total;

            if (isSame) {
              // Dữ liệu không đổi -> dùng local
              return of(cached.addresses);
            }

            // Version khác -> tải lại list
            return this.fetchAndCache(deviceId);
          }),
          catchError(() => {
            // API version lỗi -> fallback dùng local cho an toàn UX
            return of(cached.addresses);
          })
        );
      })
    );
  }

  /** Thêm địa chỉ mới -> gọi API ghi, cập nhật cache ngay */
  createAddress(params: ICreateAddressParams): Observable<IResponseApi<IAddressItem>> {
    return from(this.getCurrentDeviceId()).pipe(
      switchMap((deviceId) =>
        this.addressApi.addressCreate(params).pipe(
          tap(() => this.refreshAfterMutation()),
          catchError(() => of(this.createLocalAddress(deviceId, params)))
        )
      )
    );
  }

  /** Sửa địa chỉ -> gọi API ghi, cập nhật cache ngay */
  updateAddress(params: IUpdateAddressParams): Observable<IResponseApi<IAddressItem>> {
    return from(this.getCurrentDeviceId()).pipe(
      switchMap((deviceId) =>
        this.addressApi.addressUpdate(params).pipe(
          tap(() => this.refreshAfterMutation()),
          catchError(() => of(this.updateLocalAddress(deviceId, params)))
        )
      )
    );
  }

  /** Xóa (ẩn) địa chỉ -> gọi API ghi, cập nhật cache ngay */
  deleteAddress(params: IDeleteAddressParams): Observable<IResponseApi<null>> {
    return from(this.getCurrentDeviceId()).pipe(
      switchMap((deviceId) =>
        this.addressApi.addressDelete(params).pipe(
          tap(() => this.refreshAfterMutation()),
          catchError(() => of(this.deleteLocalAddress(deviceId, params.id)))
        )
      )
    );
  }

  /** Đặt địa chỉ làm mặc định -> gọi API ghi, cập nhật cache ngay */
  setDefaultAddress(params: ISetDefaultAddressParams): Observable<IResponseApi<null>> {
    return from(this.getCurrentDeviceId()).pipe(
      switchMap((deviceId) =>
        this.addressApi.addressSetDefault(params).pipe(
          tap(() => this.refreshAfterMutation()),
          catchError(() => of(this.setDefaultLocalAddress(deviceId, params.id)))
        )
      )
    );
  }

  /** Xóa toàn bộ cache local của user đang đăng nhập (vd khi logout) */
  clearCache(): void {
    localStorage.removeItem(this.cacheKey());
  }

  // ===================== Private helpers =====================

  /** Sau khi Thêm/Sửa/Xóa/SetDefault -> tải lại list mới nhất và ghi cache */
  private refreshAfterMutation(): void {
    from(this.getCurrentDeviceId())
      .pipe(switchMap((deviceId) => this.fetchAndCache(deviceId)))
      .subscribe();
  }

  /** Gọi API "list", suy ra version từ kết quả, ghi cache */
  private fetchAndCache(deviceId: string): Observable<IAddressItem[]> {
    return this.addressApi.addressList().pipe(
      map((res: any): IAddressItem[] => (res?.data ?? []) as IAddressItem[]),
      tap((addresses: IAddressItem[]) => {
        const version = this.computeVersionFromList(addresses);
        this.writeCache({
          deviceId,
          version,
          addresses,
        });
      })
    );
  }

  /** Tính max(updatedAt) + total từ list địa chỉ (dùng khi không gọi API version riêng) */
  private computeVersionFromList(addresses: IAddressItem[]): {maxUpdatedAt: number; total: number} {
    const maxUpdatedAt = addresses.reduce((max, item) => {
        return item.updatedAt > max ? item.updatedAt : max;
    }, 0);
    return {maxUpdatedAt, total: addresses.length};
  }

  private createLocalAddress(deviceId: string, params: ICreateAddressParams): IResponseApi<IAddressItem> {
    const cache = this.readCache();
    const addresses = cache?.addresses ?? [];
    const now = Date.now();
    const saved: IAddressItem = {
      id: this.generateLocalId(addresses),
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      shipToCityLocationId: params.shipToCityLocationId,
      shipToDistrictLocationId: params.shipToDistrictLocationId,
      shipToWardLocationId: params.shipToWardLocationId,
      provinceName: params.provinceName,
      districtName: params.districtName,
      wardName: params.wardName,
      address: params.address,
      locationVer: params.locationVer,
      type: params.type,
      isDefault: params.isDefault ?? 0,
      note: params.note,
      status: 1,
      createdAt: now,
      updatedAt: now,
    };

    const next = this.normalizeDefaultAddress([...addresses, saved], saved.id, saved.isDefault);
    this.writeCache({
      deviceId,
      version: this.computeVersionFromList(next),
      addresses: next,
    });

    return {data: saved} as IResponseApi<IAddressItem>;
  }

  private updateLocalAddress(deviceId: string, params: IUpdateAddressParams): IResponseApi<IAddressItem> {
    const cache = this.readCache();
    const addresses = cache?.addresses ?? [];
    const existing = addresses.find((item) => item.id === params.id);
    const now = Date.now();

    const saved: IAddressItem = {
      id: params.id,
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      shipToCityLocationId: params.shipToCityLocationId,
      shipToDistrictLocationId: params.shipToDistrictLocationId,
      shipToWardLocationId: params.shipToWardLocationId,
      provinceName: params.provinceName,
      districtName: params.districtName,
      wardName: params.wardName,
      address: params.address,
      locationVer: params.locationVer,
      type: params.type,
      isDefault: params.isDefault ?? existing?.isDefault ?? 0,
      note: params.note ?? existing?.note,
      status: existing?.status ?? 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const next = this.normalizeDefaultAddress(
      addresses.some((item) => item.id === params.id)
        ? addresses.map((item) => (item.id === params.id ? saved : item))
        : [...addresses, saved],
      saved.id,
      saved.isDefault
    );

    this.writeCache({
      deviceId,
      version: this.computeVersionFromList(next),
      addresses: next,
    });

    return {data: saved} as IResponseApi<IAddressItem>;
  }

  private deleteLocalAddress(deviceId: string, id: number): IResponseApi<null> {
    const cache = this.readCache();
    const addresses = cache?.addresses ?? [];
    const next = addresses.filter((item) => item.id !== id);

    this.writeCache({
      deviceId,
      version: this.computeVersionFromList(next),
      addresses: next,
    });

    return {data: null} as IResponseApi<null>;
  }

  private setDefaultLocalAddress(deviceId: string, id: number): IResponseApi<null> {
    const cache = this.readCache();
    const addresses = cache?.addresses ?? [];
    const next = this.normalizeDefaultAddress(addresses, id, 1);

    this.writeCache({
      deviceId,
      version: this.computeVersionFromList(next),
      addresses: next,
    });

    return {data: null} as IResponseApi<null>;
  }

  private normalizeDefaultAddress(addresses: IAddressItem[], defaultId: number, defaultValue: 0 | 1): IAddressItem[] {
    if (defaultValue !== 1) return addresses;

    return addresses.map((item) => ({
      ...item,
      isDefault: item.id === defaultId ? 1 : 0,
    }));
  }

  private generateLocalId(addresses: IAddressItem[]): number {
    const existingIds = new Set(addresses.map((item) => item.id));
    let candidate = -Date.now();

    while (existingIds.has(candidate)) {
      candidate -= 1;
    }

    return candidate;
  }

  private readCache(): IAddressCacheData | null {
    try {
      const raw = localStorage.getItem(this.cacheKey());
      if (!raw) return null;
      return JSON.parse(raw) as IAddressCacheData;
    } catch {
      return null;
    }
  }

  private writeCache(data: IAddressCacheData): void {
    try {
      localStorage.setItem(this.cacheKey(), JSON.stringify(data));
    } catch {
      // localStorage lỗi (vd quota) -> bỏ qua, không ảnh hưởng luồng chính
    }
  }

  private cacheKey(): string {
    const webAppUserId = this.userService.webAppUserId || 'anonymous';
    return `${this.STORAGE_PREFIX}${webAppUserId}`;
  }

  /** Lấy deviceId hiện tại qua Zalo Mini App SDK */
  private async getCurrentDeviceId(): Promise<string> {
    try {
      const deviceId = await getDeviceIdAsync();
      console.log('deviceId:', deviceId);
      return deviceId || 'unknown';
    } catch (error) {
      console.warn('Không lấy được deviceId:', error);
      return 'unknown';
    }
  }
}