export interface IResBanner {
  id: number;
  name: string;
  link?: string,
  imageUrl?: string;
  video?: string;
  displayOrder: number;
  description: string;
  content: string;
}

export const BANNER_POSITION_CODE = {
  SLIDE: 'BANNER_SLIDE_MINI_APP', //Banner slide mini app trang chủ
  MIDDLE: 'BANNER_MIDDLE_MINI_APP', //Banner ở giữa trang chủ mini app
  TOP: 'BANNER_TOP_MINI_APP', //Banner đầu trang chủ mini app
  BOTTOM: 'BANNER_BOTTOM_MINI_APP', //Banner cuối trang chủ mini app
  POPUP: 'BANNER_POPUP_MINI_APP', //Banner popup mini app
} as const;

export type BannerCode = typeof BANNER_POSITION_CODE[keyof typeof BANNER_POSITION_CODE];
