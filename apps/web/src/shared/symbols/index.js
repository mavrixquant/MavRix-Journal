// apps/web/src/shared/symbols/index.js
//
// Public surface of the symbol-icon subsystem.
//
//   getIconSpec(symbol)                       → icon spec or null
//   <SymbolIcon symbol size ... />            → rendered icon
//   <SymbolSelect value onChange ... />       → searchable symbol dropdown

export { default as SymbolIcon } from './SymbolIcon';
export { default as SymbolSelect } from './SymbolSelect';
export { getIconSpec } from './symbolIcons';