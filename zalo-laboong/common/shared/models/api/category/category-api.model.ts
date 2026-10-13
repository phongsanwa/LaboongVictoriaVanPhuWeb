
// Danh sách danh mục
export interface ILoadCategoryParams {
  parentId?: number | string,
}
export interface IResLoadCategory {
  id: number | string;
  parentId: number | string | null;
  code: string;
  name: string;
  viewLink: string;
  image: string;
  description: string;
  childs?: IResLoadCategory[];
}

// Lấy danh sách sản phẩm theo danh mục
export interface IProductByCategoryParams {
  categoryId: number | string;
  page?: number;
  pageSize?: number;
  loadAttr?: boolean;
  attrColumnValues?: Record<string, string[]>;
  [key: string]: unknown;
}

export interface ILoadProductAttributeParams {
  categoryId: number | string;
}

export interface IProductAttributeValue {
  id: number;
  attributeId: number;
  name: string;
  code: string;
  value: number;
  order: number;
}

export interface IProductAttribute {
  id: number;
  name: string;
  variable: string;
  column: string;
  parentId: number | string | null;
  values: IProductAttributeValue[];
  childs?: IProductAttribute[];
}
