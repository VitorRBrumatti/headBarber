export type MetaPixelStandardEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "Contact"
  | "CompleteRegistration"
  | "InitiateCheckout";

export type MetaPixelParams = Record<
  string,
  string | number | boolean | undefined
>;

export interface MetaPixelFunction {
  (command: "init", pixelId: string): void;
  (
    command: "track",
    event: MetaPixelStandardEvent,
    params?: MetaPixelParams,
  ): void;
  (command: "trackCustom", event: string, params?: MetaPixelParams): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: MetaPixelFunction;
  loaded?: boolean;
  version?: string;
}

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
  }
}
