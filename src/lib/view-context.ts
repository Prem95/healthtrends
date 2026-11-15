/**
 * Where a screen is being rendered. The signed-in app and the public sample
 * dashboard share every view; this is the only thing that differs between
 * them — which URL space links point into, and whether editing is offered.
 */
export type ViewCtx = {
  base: "/app" | "/demo";
  readOnly: boolean;
};

export const APP_CTX: ViewCtx = { base: "/app", readOnly: false };
export const DEMO_CTX: ViewCtx = { base: "/demo", readOnly: true };
