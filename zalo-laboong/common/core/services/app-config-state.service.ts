import {Injectable} from '@angular/core';

export interface IZmaRuntimeConfig {
  miniAppId?: string | null;
  businessId?: number | null;
  zaloOaId?: string | null;
  appTitle?: string | null;
  headerTitle?: string | null;
  headerColor?: string | null;
  appLogoUrl?: string | null;
}

@Injectable({providedIn: 'root'})
export class AppConfigStateService {
  private _businessId: number = 0;
  private _zaloOaId: string | null = null;
  private _appTitle: string | null = null;
  private _headerTitle: string | null = null;
  private _headerColor: string | null = null;
  private _appLogoUrl: string | null = null;

  setFromApiResponse(data: IZmaRuntimeConfig): void {
    this._businessId = data.businessId ?? 0;
    this._zaloOaId = data.zaloOaId ?? null;
    this._appTitle = data.appTitle ?? null;
    this._headerTitle = data.headerTitle ?? null;
    this._headerColor = data.headerColor ?? null;
    this._appLogoUrl = data.appLogoUrl ?? null;
  }

  get businessId(): number {
    return this._businessId;
  }

  get zaloOaId(): string | null {
    return this._zaloOaId;
  }

  get appTitle(): string | null {
    return this._appTitle;
  }

  get headerTitle(): string | null {
    return this._headerTitle;
  }

  get headerColor(): string | null {
    return this._headerColor;
  }

  get appLogoUrl(): string | null {
    return this._appLogoUrl;
  }
}
