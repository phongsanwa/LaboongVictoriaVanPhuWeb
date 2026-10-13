/**
 * ---------------------------------------------------------------------------------------------------------
 * File này sẽ khai báo toàn bộ "CONST" | "INTERFACE" cho phần kết nối với API -----------------------------
 * ---------------------------------------------------------------------------------------------------------
 * */
export enum HEADER_STATUS_CODE {
	 FOUND = 302,
	 UNAUTHORIZED = 401,
	 FORBIDDEN = 403,
	 NOT_FOUND = 404,
	 INTERNAL_SERVER_ERROR = 500,
}

export const ERROR_CODE = {
	 REQUIRED_TOKEN: 'ERR_REQUIRED_TOKEN',
	 INVALID_TOKEN: 'ERR_INVALID_TOKEN',
	 REQUIRED_FILTER_DATA: 'ERR_REQUIRED_FILTER_DATA',
	 REQUIRED_FILTER_FIELD: 'ERR_REQUIRED_FILTER_FIELD',
	 REQUIRED_FORM_DATA: 'ERR_REQUIRED_FORM_DATA',
	 INVALID_FORM_FIELDS: 'ERR_INVALID_FORM_FIELDS',
	 PAGE_401: 'ERR_PAGE_401',
	 PAGE_403: 'ERR_PAGE_403',
	 PAGE_404: 'ERR_PAGE_404',
	 DATA_403: 'ERR_DATA_403',
	 DATA_404: 'ERR_DATA_404',
}
