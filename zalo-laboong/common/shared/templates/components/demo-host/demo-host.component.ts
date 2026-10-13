import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectionStrategy,
  inject, AfterViewInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import {
  IZmaBaseTemplateConfig,
  IZmaTemplateBlockDefinition,
  IZmaTemplateBlocksDefaults,
  ZmaTemplateCode,
} from 'common/shared/templates';
import { ZMA_TEMPLATES } from 'common/shared/templates';
import { DemoUiConfigService } from 'common/core/services/demo-ui-config.service';
import { SpinnerService } from 'common/core/services/spinner.service';
import {AppService} from '../../../../core/services'; // hoặc path thực tế của bạn

@Component({
  selector: 'app-demo-host',
  templateUrl: './demo-host.component.html',
  styles: [`
    .overflow-y-auto {
      overflow-y: auto;
    }

    .flex-1_custom {
      flex: 1 1 0%;
    }

    .flex-col {
      flex-direction: column;
    }

    .w-screen {
      width: 100vw;
    }

    .h-screen {
      height: 100vh;
    }

  `],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoHostComponent implements OnInit, AfterViewInit, OnDestroy {
  template: IZmaBaseTemplateConfig | null = null;
  finalBlocks: IZmaTemplateBlockDefinition[] = [];
  blocksData: IZmaTemplateBlocksDefaults = {};
  readonly debug = true;

  private destroy$ = new Subject<void>();
  private readonly DEFAULT_STATE = 'Z1A';

  readonly spinner = inject(SpinnerService);
  readonly isLoading$ = this.spinner.isLoading$;

  // scroll
  private scrollContainer?: HTMLElement;
  private lastScrollTop = 0;

  constructor(
    private route: ActivatedRoute,
    private demoUiConfig: DemoUiConfigService,
    private appService: AppService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const stateKey = params.get('state') || this.DEFAULT_STATE;

        const templateCode = this.resolveTemplateCodeByState(stateKey);
        const tpl = this.resolveTemplate(templateCode);

        if (!tpl) {
          console.warn('[DemoHost] Không tìm thấy template với code =', templateCode);
          this.template = null;
          this.finalBlocks = [];
          this.blocksData = {};
          this.demoUiConfig.setActiveTemplate(null);
          return;
        }

        this.template = tpl;
        this.blocksData = tpl.defaultBlocksData;
        this.demoUiConfig.setActiveTemplate(tpl);

        this.finalBlocks = this.buildBlocksForState(tpl, stateKey);
        this.appService.closeSplashOnce$()
        if (this.debug) {
          console.log('[DemoHost] state =', stateKey);
          console.log('[DemoHost] finalBlocks =', this.finalBlocks);
        }
      });
  }

  ngAfterViewInit(): void {
    this.scrollContainer = document.querySelector('.flex-1_custom') as HTMLElement;
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.onScroll);
    } else {
      window.addEventListener('scroll', this.onScroll);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.onScroll);
    } else {
      window.removeEventListener('scroll', this.onScroll);
    }
  }

  // Map state -> templateCode (set cứng)
  private resolveTemplateCodeByState(stateKey: string): ZmaTemplateCode {
    switch (stateKey) {
      case 'Z1A':
      case 'Z1B':
        return 'zma-0001';
      case 'Z2A':
        return 'zma-0002';
      case 'Z3A':
        return 'zma-0003';
      case 'Z4A':
        return 'zma-0004';
      default:
        return 'zma-0001';
    }
  }

  private resolveTemplate(code: ZmaTemplateCode): IZmaBaseTemplateConfig | null {
    return ZMA_TEMPLATES[code] ?? null;
  }

  private buildBlocksForState(
    tpl: IZmaBaseTemplateConfig,
    stateKey: string,
  ): IZmaTemplateBlockDefinition[] {
    const baseMap = new Map<string, IZmaTemplateBlockDefinition>(
      tpl.blocks.map((b) => [b.id, b]),
    );

    const fromIds = (ids: string[]): IZmaTemplateBlockDefinition[] =>
      ids
        .map((id) => baseMap.get(id))
        .filter((b): b is IZmaTemplateBlockDefinition => !!b);

    switch (stateKey) {
      case 'Z1A': {
        return [...tpl.defaultLayout]
          .filter((l) => l.visible !== false)
          .sort((a, b) => a.order - b.order)
          .map((l) => baseMap.get(l.id))
          .filter((b): b is IZmaTemplateBlockDefinition => !!b);
      }

      case 'Z1B': {
        return fromIds([
          'mainCategories',
          'heroBanner',
          'featuredProducts',
          'uspFeatures',
        ]);
      }

      case 'Z2A': {
        return [...tpl.defaultLayout]
          .filter((l) => l.visible !== false)
          .sort((a, b) => a.order - b.order)
          .map((l) => baseMap.get(l.id))
          .filter((b): b is IZmaTemplateBlockDefinition => !!b);
      }

      case 'Z3A': {
        return fromIds([
          'heroBanner',
          'mainCategories',
        ]);
      }

      case 'Z4A': {
        return [...tpl.defaultLayout]
          .filter((l) => l.visible !== false)
          .sort((a, b) => a.order - b.order)
          .map((l) => baseMap.get(l.id))
          .filter((b): b is IZmaTemplateBlockDefinition => !!b);
      }

      default: {
        return [...tpl.defaultLayout]
          .filter((l) => l.visible !== false)
          .sort((a, b) => a.order - b.order)
          .map((l) => baseMap.get(l.id))
          .filter((b): b is IZmaTemplateBlockDefinition => !!b);
      }
    }
  }

  getBlockData(blockId: string): any {
    const block = this.blocksData[blockId];
    return block?.data ?? null;
  }

  // dùng cho app-fab-actions
  openShare(): void {
    // TODO: tích hợp share miniapp / gửi link demo
    console.log('[DemoHost] openShare clicked');
  }

  // ====== LOGIC SCROLL ======
  private onScroll = () => {
    if (!this.scrollContainer) return;

    const st = this.scrollContainer.scrollTop;
    const footerEl = document.querySelector('.bottom-navigation') as HTMLElement | null;
    // Ưu tiên header-color--style2, vẫn hỗ trợ các class cũ nếu có
    const headerEl = document.querySelector(
      '.header-color--style2',
    ) as HTMLElement | null;

    if (!footerEl || !headerEl) return;

    const scrollHeight = this.scrollContainer.scrollHeight;
    const clientHeight = this.scrollContainer.clientHeight;
    const isNearBottom = st + clientHeight >= scrollHeight - 50; // threshold 50px
    if (st <= 10) {
      footerEl.classList.remove('hidden');
      headerEl.classList.remove('scroll');
      this.lastScrollTop = st;
      return;
    }

    if (isNearBottom) {
      footerEl.classList.add('hidden');
      headerEl.classList.add('scroll');
      this.lastScrollTop = st;
      return;
    }

    const scrollDiff = Math.abs(st - this.lastScrollTop);
    if (scrollDiff < 5) {
      return;
    }

    if (st > this.lastScrollTop) {
      // Scroll down
      footerEl.classList.add('hidden');
      headerEl.classList.add('scroll');
    } else {
      // Scroll up
      footerEl.classList.remove('hidden');
      headerEl.classList.remove('scroll');
    }

    this.lastScrollTop = st <= 0 ? 0 : st;
  };
}
