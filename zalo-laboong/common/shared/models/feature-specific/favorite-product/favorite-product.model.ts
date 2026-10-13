
export interface IFavoriteProduct {
  id: number;
  name: string;
  image: string;
  price: number | null;
  addedAt: number;
}

export interface IFavoriteList {
  id: string;
  name: string;
  createdAt: number;
  data?: IFavoriteProduct[];
}


export interface IFavoriteList {
  id: string;
  name: string;
  createdAt: number;
  data?: IFavoriteProduct[];
}

export const FAV_KEY = (uid: string) => `fav:lists:${uid || 'guest'}`;
