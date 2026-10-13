export * from './promotion-evaluate.model';

export interface IInfoGameParams {
  id: string
}

export interface IResInfoGame {
  id: string;
  name: string;
  description: string;
  startedDateTime: string;
  endedDateTime: string;
  image: string;
  background: string;
  valueItems: string[];
  coordinate: string[];
}
