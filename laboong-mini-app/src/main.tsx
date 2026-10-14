import React from "react";
import { createRoot } from "react-dom/client";
import { App, SnackbarProvider, ZMPRouter } from "zmp-ui";
import "zmp-ui/zaui.css";
import "./css/app.css";
import appConfig from "../app-config.json";
import { Layout } from "./components/layout";
import { AuthProvider } from "./state/auth";
import { CartProvider } from "./state/cart";
import { DataProvider } from "./state/data";

if (!(window as any).APP_CONFIG) (window as any).APP_CONFIG = appConfig;

function Root() {
  return (
    <App theme="light">
      <SnackbarProvider>
        <AuthProvider>
          <DataProvider>
            <CartProvider>
              <ZMPRouter>
                <Layout />
              </ZMPRouter>
            </CartProvider>
          </DataProvider>
        </AuthProvider>
      </SnackbarProvider>
    </App>
  );
}

createRoot(document.getElementById("app")!).render(<Root />);
