declare module "zod" {
  // Minimal runtime and type shim to allow compiling without installed zod
  // This is a fallback for offline/dev only. Replace with real `zod` when network is available.
  export const z: any;
  export namespace z {
    export type infer<T> = any;
  }
}