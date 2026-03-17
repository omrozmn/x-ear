/**
 * UI Web Package Shims
 *
 * Previously this file declared types for "@/packages/ui-web", a module path
 * that does not match any import in the codebase (the correct specifier is
 * "@x-ear/ui-web").  The tsconfig path mapping resolves @x-ear/ui-web to the
 * actual package source, which already provides correct TypeScript types.
 *
 * This file is kept as a placeholder so the tsconfig include for "src/types"
 * does not regress.
 */
export {};
