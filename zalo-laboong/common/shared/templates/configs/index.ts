import { IZmaBaseTemplateConfig, ZmaTemplateCode } from '../models/zma-template.model';
import { ZMA_TEMPLATE_ZMA_0001 } from './zma-0001.template';
import {ZMA_TEMPLATE_ZMA_0002} from './zma-0002.template';
import {ZMA_TEMPLATE_ZMA_0003} from './zma-0003.template';
import {ZMA_TEMPLATE_ZMA_0004} from './zma-0004.template';

export const ZMA_TEMPLATES: Record<ZmaTemplateCode, IZmaBaseTemplateConfig> = {
  'zma-0001': ZMA_TEMPLATE_ZMA_0001,
  'zma-0002': ZMA_TEMPLATE_ZMA_0002,
  'zma-0003': ZMA_TEMPLATE_ZMA_0003,
  'zma-0004': ZMA_TEMPLATE_ZMA_0004,
};
