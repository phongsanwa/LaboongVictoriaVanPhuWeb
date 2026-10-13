# Zalo mini app - Angular Monorepo

- [Angular CLI](https://github.com/angular/angular-cli)  20.2.0
- Repo code: https://github.com/

## Reference

- [Angular](https://angular.dev/overview):  20.2.0
- [Typescript](https://www.typescriptlang.org/docs/handbook/intro.html): ~5.9.2
- [Phosphor Icons](https://phosphoricons.com/): 2.x
- [Javascript](https://www.w3schools.com/js/js_intro.asp): Kiến thức nền tảng để xử lý công việc trong angular
- [RxJS](https://rxjs.dev/guide/operators): ~7.8.0 Thư viện cung cấp các toán tử để xử lý dữ liệu kết hợp với Observer
- Giao diện:  Sử dụng kết hợp Bootstrap
  - [Bootstrap](https://getbootstrap.com/docs/5.0/getting-started/introduction/): Version 5

## Project structure

- `src/libs/core`: Folder chứa code xử lý logic chung của project không phụ thuộc bất kỳ feature nào.
- `src/libs/shared`: Folder chứa code tái sử dụng trong các feature để tránh việc lặp lại code
- `src/apps`: Folder chứa các app của project.

### Plain text structure

```
.
├─ apps/                                  # Chứa các app con
│  ├─ zma-0001/                         
│  │  └─ src/
│  │     ├─ .env                          # Biến môi trường riêng cho app
│  │     ├─ app-config.json               # Cấu hình của app
│  │     ├─ tsconfig.app.json             # TS config khi build/chạy app
│  │     └─ tsconfig.spec.json            # TS config cho unit test
│  └─ zma-0002/                          
│     └─ src/
│        ├─ .env                          # Biến môi trường riêng cho app
│        ├─ app-config.json               # Cấu hình của app
│        ├─ tsconfig.app.json             # TS config khi build/chạy app
│        └─ tsconfig.spec.json            # TS config cho unit test
├─ dist/                                   # Thư mục output sau build
├─ common/                                   # Libs dùng chung cho nhiều app
│  ├─ core/                               
│  │  ├─ interceptors/                     # HTTP interceptors
│  │  ├─ models/                           # Interfaces/types chung
│  │  ├─ services/                         # Singleton services (Auth, API…)
│  │  ├─ utils/                            # Helpers, tiện ích
│  │  └─ core.module.ts                    
│  ├─ share/                               # Thành phần tái sử dụng (UI/logic)
│  │  ├─ components/                       # Reusable UI components
│  │  ├─ directives/                       # Reusable directives
│  │  ├─ models/                           # Models cho layer share
│  │  ├─ pipes/                            # Reusable pipes
│  │  ├─ services/                         # Services hỗ trợ cho share
│  │  ├─ index.ts                          # Barrel file export public API
│  │  └─ shared-common.module.ts           # NgModule export components/pipes/directives
│  └─ assets/                              # Tài nguyên chung
│     └─ css/
├─ node_modules/                           # Dependencies cài qua npm/pnpm
├─ .editorconfig                           # Quy ước format code cho editor
├─ .env                                    # Biến môi trường root (dùng chung; app có thể override)
├─ .gitignore                              # Bỏ qua file/thư mục khi commit Git
├─ angular.json                            # Cấu hình Angular workspace
├─ app-config.json                         # Cấu hình mẫu/dùng chung; script đồng bộ vào app con
├─ package.json                            # Metadata, scripts, dependencies
├─ package-lock.json                       # Khóa phiên bản dependencies
├─ README.md                               # Tài liệu dự án
├─ tsconfig.json                           # TS config gốc (các tsconfig khác extends)
├─ update-app-config.js                    # (deprecated) dùng npm run zma:build / zma:deploy
└─ webpack.extra.js                        # Webpack override/merge (alias, loader, define env…)
```

## Chạy local, Build & Deploy

> Toàn bộ hướng dẫn **chạy local**, **build** và **deploy** mini app đã tách sang tài liệu riêng.
> README chỉ giữ phần giới thiệu & cấu trúc dự án.

- **[docs/zma-build-deploy-guide.md](docs/zma-build-deploy-guide.md)** — hướng dẫn thao tác: setup môi trường, `npm run local`, `zma:build`, `zma:deploy`, xử lý sự cố.
- **[docs/zma-build-deploy-architecture.md](docs/zma-build-deploy-architecture.md)** — cơ chế đằng sau: token per-app, GUARD chặn deploy nhầm app, sơ đồ vòng đời + cây quyết định.
