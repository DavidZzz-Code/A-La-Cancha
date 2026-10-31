import { registerHooks } from 'node:module';
// Node ejecuta TS sin transpilar en estas pruebas; Metro resuelve los workspaces en la app.
registerHooks({resolve(specifier,context,next) {
  if (specifier === '@alacancha/domain') return {url:new URL('../packages/domain/src/index.ts',import.meta.url).href,shortCircuit:true};
  if (specifier === './catalog' && context.parentURL?.endsWith('/demo-store.ts')) return {url:new URL('../apps/mobile/src/lib/catalog.ts',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}});
