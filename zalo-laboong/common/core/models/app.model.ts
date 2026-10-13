interface ISelectOptionBase {
  value: any;
  labelSuffix?: string;
  disable?: boolean;
  options?: ISelectOption[];
  iconLeft?: {
    classFont: string;
    text?: string;
    title?: string;
  };
  active?: boolean;
  checked?: boolean;
  display?: boolean;
}

interface ISelectOptionWithLabel extends ISelectOptionBase {
  label: any;
  labelTranslate?: any;
}

interface ISelectOptionWithLabelTranslate extends ISelectOptionBase {
  label?: any;
  labelTranslate: any;
}

export type ISelectOption = ISelectOptionWithLabel | ISelectOptionWithLabelTranslate;
