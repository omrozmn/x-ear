/**
 * React Type Compatibility Shim
 *
 * Previously this file re-declared every component exported by @x-ear/ui-web.
 * Because the admin tsconfig resolves @x-ear/ui-web to the actual package
 * source via path mapping, those duplicate declarations caused TS2395 errors
 * ("Individual declarations in merged declaration must be all exported or all
 * local").
 *
 * The actual package source already provides correct TypeScript types, so no
 * module augmentation is needed.  This file is kept as a placeholder to avoid
 * breaking the tsconfig "include" entry for "src/types".
 */
export {};
