import {APP_INITIALIZER, inject, NgModule, Optional, provideAppInitializer, SkipSelf} from '@angular/core';
import {HttpInterceptorProviders} from "./interceptors";
import Aura from '@primeng/themes/aura';
import {InputNumberModule} from "primeng/inputnumber";
import {providePrimeNG} from "primeng/config";
import {definePreset} from '@primeng/themes';
import {provideAnimations} from '@angular/platform-browser/animations';
import {NgxToastRootModule, TransLocoProviders} from './libs';
import {UserService} from './services';
import {map, take} from 'rxjs';

export function hydrateUser(userService: UserService) {
  return () => userService.hydrateFromStorage$().pipe(map(() => void 0));
}

/**
 * https://primeng.org/theming
 * @author TungLx
 * */
const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{stone.50}',
      100: '{stone.100}',
      200: '{stone.200}',
      300: '{stone.300}',
      400: '{stone.400}',
      500: '{stone.500}',
      600: '{stone.600}',
      700: '{stone.700}',
      800: '{stone.800}',
      900: '{stone.900}',
      950: '{stone.950}'
    }
  }
});

@NgModule({
  imports: [
    InputNumberModule,
    NgxToastRootModule
  ],
  providers: [
    HttpInterceptorProviders,
    TransLocoProviders,
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: MyPreset,
        options: {
          darkModeSelector: false
        },
      },
    }),
    provideAppInitializer(() => {
      const userService = inject(UserService);
      return userService.hydrateFromStorage$().pipe(take(1));
    }),
  ]
})
export class CoreModule {
  constructor(
    @Optional() @SkipSelf() parent: CoreModule,
  ) {
    if (parent) throw new Error('CoreModule đã được import rồi');
  }
}
