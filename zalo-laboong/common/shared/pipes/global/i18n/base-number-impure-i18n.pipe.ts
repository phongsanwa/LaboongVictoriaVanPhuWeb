import {Subscription} from "rxjs";
import {BusinessI18nService, IBusinessI18nConfig} from '../../../../core/libs';


/**
 * Base abstract class cho các pipe impure dùng chung config & cache
 */
export abstract class BaseNumberImpureI18nPipe<TOpts> {

  protected configs: IBusinessI18nConfig;
  protected sub?: Subscription;

  // Cache
  protected lastValue: any;
  protected lastOpts?: TOpts;
  protected lastConfigsRef?: IBusinessI18nConfig;
  protected lastResult: string | null = null;

  constructor(
    protected businessI18nService: BusinessI18nService
  ) {
    // Lấy config ban đầu
    this.configs = this.businessI18nService.getLocaleConfigs();

    // Lắng nghe thay đổi config (1 subscription duy nhất)
    this.sub = this.businessI18nService.configs$.subscribe(newConfigs => {
      this.configs = newConfigs;
      // Lần tới transform, nếu config ref thay đổi => format lại
    });
  }

  public destroy(): void {
    this.sub?.unsubscribe();
  }

  /**
   * transform chung:
   *  - Kiểm tra cache
   *  - Nếu đổi -> gọi formatValue()
   *  - Cập nhật cache, trả về
   */
  transform(value: any, opts?: TOpts): string | null {
    if (
      this.lastConfigsRef === this.configs &&
      this.lastValue === value &&
      this.isSameOpts(this.lastOpts, opts)
    ) {
      // Không đổi => trả về kết quả cũ
      return this.lastResult;
    }

    const result = this.formatValue(value, opts);

    // Cập nhật cache
    this.lastConfigsRef = this.configs;
    this.lastValue = value;
    this.lastOpts = opts;
    this.lastResult = result;

    return result;
  }

  /**
   * Hàm này mỗi pipe con phải override
   * để định nghĩa logic format thực tế.
   */
  protected abstract formatValue(value: any, opts?: TOpts): string | null;

  /**
   * Hàm so sánh 2 đối tượng `opts` (nếu có)
   * Mặc định shallow check, pipe con override nếu cần.
   */
  protected isSameOpts(oldOpts?: TOpts, newOpts?: TOpts): boolean {
    return oldOpts === newOpts;
  }

}
