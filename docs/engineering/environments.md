# Entornos y calidad

La app actual usa datos demo locales: no necesita Supabase ni variables. El ejemplo en apps/mobile/.env.example prepara los nombres para #6; estas variables todavia no activan autenticacion ni reservas reales.

## Separacion de entornos

- Desarrollo: proyecto Supabase exclusivo con datos ficticios. Copiar el ejemplo a apps/mobile/.env.local cuando se implemente el cliente.
- CI: PostgreSQL efimero con credenciales desechables, sin acceso a proyectos reales.
- Produccion: proyecto separado, pendiente del piloto y de las pruebas de permisos. No reutilizar datos ni credenciales de desarrollo.

Expo publica las variables EXPO_PUBLIC_* dentro del bundle. Solo URL y clave publicable pueden llegar al cliente. Las claves secretas, service_role y credenciales de base de datos permanecen en el servidor o gestor de secretos; nunca en la app ni en archivos versionados. La clave publicable no sustituye autenticacion ni RLS.

## Comprobaciones

Con Node 24: npm ci y npm run check (ESLint, TypeScript y pruebas de reglas). npm run lint permite revisar solo codigo. CI tambien exporta web/Android/iOS, ejecuta Playwright y prueba migraciones, permisos y concurrencia con PostgreSQL 17.

El workflow quality.yml se ejecuta para todos los PR hacia main, sin filtros de rutas. Required quality checks exige que prototype y database terminen correctamente; tambien falla si uno se cancela u omite. Este es el check que debe exigirse al proteger main (#21). Crear el check no configura la proteccion: la regla de GitHub sigue pendiente de verificarse.

No exigir autoaprobacion al unico mantenedor. La proteccion propuesta debe exigir PR, bloquear borrado y force push, y requerir el check anterior. Documentar cualquier excepcion administrativa cuando se configure.
