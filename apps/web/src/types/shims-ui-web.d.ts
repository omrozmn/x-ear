/**
 * UI Web Package Shims
 * 
 * This file provides type declarations for the @x-ear/ui-web package.
 * Using `any` types here is acceptable because:
 * 
 * 1. This is a temporary shim for an internal package that lacks proper type exports
 * 2. The UI components are React components with complex prop types
 * 3. This shim exists only for module resolution during the migration period
 * 4. Consumers should refer to Storybook documentation for component APIs
 * 
 * TODO: Add proper TypeScript definitions to @x-ear/ui-web package
 * TODO: Export component prop types from the package
 * TODO: Remove this shim file once the package has proper types
 */

declare module "@/packages/ui-web" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Modal: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Button: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Input: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Table: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const DatePicker: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export default any;
}
