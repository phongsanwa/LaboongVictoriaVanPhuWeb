import {Injectable} from '@angular/core';
import {ApiService} from '@core/services';
import {IResponseApi} from '@core/models';
import {uriApiConst} from '@shared/constants';
import {
  IGetCategoryNewsParams,
  INewDetailParams,
  IResGetCategoryNews,
  IResNewsDetail,
  IResNewsList,
  ISearchNewsListParam
} from '@shared/models/api';
import {IResDataDefault} from '../../../../core/models';
import {IParamArticleByType, IResArticleByType} from '../../../models/api';

@Injectable({
  providedIn: 'any',
})

export class NewsApiService extends ApiService {
  // Danh sách tin tức
  searchNewsList = (params: ISearchNewsListParam) => {
    return this.post<IResponseApi<IResDataDefault<IResNewsList[]>>>(uriApiConst.news.newsSearch, params);
  }

  // Chi tiết tin tức theo id
  getNewsDetail = (params: INewDetailParams) => {
    return this.post<IResponseApi<IResNewsDetail>>(uriApiConst.news.newsDetail, params);
  }

  // Danh sách danh mục tin tức
  getNewsCategory = (params: IGetCategoryNewsParams) => {
    return this.post<IResponseApi<IResGetCategoryNews[]>>(uriApiConst.news.newsCategory, params);
  };

  //Tin tức theo type
  loadArticleByType = (params: IParamArticleByType) => {
    return this.post<IResponseApi<IResArticleByType>>(
      uriApiConst.news.articleByType,
      params
    );
  };

}
