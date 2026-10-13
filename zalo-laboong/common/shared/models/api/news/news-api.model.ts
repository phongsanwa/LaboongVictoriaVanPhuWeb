// Danh sách tin tức
export interface ISearchNewsListParam {
  type?: number;
  categoryId?: number;
  status?: number;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  sort?: 'id' | 'displayOrder' | 'publishedDate';
  dir?: 'asc' | 'desc';
  pageSize?: number;
  nextLastId?: string;
  reqTotalCount?: '1';
}

export interface IResNewsList {
  id: number;
  title: string;
  type: number;
  category: {
    id: number;
    name: string;
  };
  description: string | null;
  avatarUri: string | null;
  status: number;
  displayOrder: number | null;
  publishedDate: string | null;
  hits: number | null;
  createdAt: number | null;
  createdBy: string | null;
  modifiedAt: number | null;
  modifiedBy: string | null;
}

// Chi tiết tin tức
export interface INewDetailParams {
  id: number;
}
export interface IResNewsDetail extends IResNewsList {
  content: string | null;
}

// Lấy danh sách danh mục tin tức
export interface IResGetCategoryNews {
  id: number;
  parent: number | null;
  name: string;
  description: string | null;
  status: number;
  displayOrder: number | null;
  level: number;
}

export interface IGetCategoryNewsParams {
  parentId?: number;
  status?: number;
}


export interface IParamArticleByType {
  // id: number;
  type: number;
}

export interface IResArticleByType {
  id: number;
  title: string;
  type: string;
  category: {
    id: number;
    name: string | null;
  };
  description: string;
  content: string;
  avatarUri: string | null;
  status: number;
  displayOrder: number | null;
  publishedDate: string;
  hits: number | null;
  createdAt: number;
  createdBy: string;
  modifiedAt: number | null;
  modifiedBy: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  sourceLink: string | null;
}
