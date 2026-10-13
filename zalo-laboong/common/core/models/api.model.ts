export interface IResPaginator {
  page: number;
  size: number;
  total: number;
}

export interface IResDataDefault<T = any[]> {
  paginator: IResPaginator;
  result: T;

  /**
   * Compatibility fields for older UI code. Prefer paginator for new code.
   */
  totalPages?: number;
  totalItems?: number;
  page?: number;
  pageSize?: number;
}

export interface IResponseApi<T = IResDataDefault, TMess = any[]> {
  code: number,
  errorCode: string | null,
  statusCode?: number, // Header status code
  messages: TMess,
  data: T,
}
