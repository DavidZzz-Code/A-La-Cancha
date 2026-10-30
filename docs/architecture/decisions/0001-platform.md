# ADR 0001: aplicación móvil multiplataforma y backend compartido

Fecha: 2026-10-30

Estado: dirección acordada para la primera implementación; versiones y servicios de pago pendientes de configuración.

## Contexto

Se busca una app atractiva y ágil para reservar canchas en Cartagena, distribuible en Google Play y App Store, con presupuesto inicial de referencia de 100 USD y desarrollo desde Windows.

## Decisión

- React Native con Expo y TypeScript para Android e iOS.
- Supabase con PostgreSQL como backend inicial propuesto: autenticación, persistencia, almacenamiento y permisos.
- Panel web para propietarios y operaciones; Next.js con TypeScript es la opción propuesta cuando se implemente.
- Web pública complementaria para enlaces de canchas. No duplicar toda la app móvil.
- Compartir contratos y tokens; compartir componentes de interfaz solo donde tenga sentido.
- Priorizar Android en el piloto y mantener compatibilidad con iOS. No pagar publicación antes de tener una versión probada.

## Consecuencias

Se comparte gran parte del código móvil, pero siguen siendo necesarias pruebas y ajustes por plataforma. Publicar requiere cuentas, verificación y revisión de tiendas. Las compilaciones iOS pueden prepararse en la nube con EAS; eso no sustituye probar en dispositivos.

No se elige todavía proveedor de cobros, estructura de comisiones ni un plan de infraestructura de pago. Evaluar costos reales antes de comprometer el presupuesto.

## Referencias consultadas

- [Expo: crear un proyecto](https://docs.expo.dev/get-started/create-a-project/).
- [EAS Build](https://docs.expo.dev/build/introduction/).
- [Registro Google Play](https://support.google.com/googleplay/android-developer/answer/6112435?hl=es-419): tarifa publicada de 25 USD, pago único.
- [Pruebas Google Play](https://support.google.com/googleplay/android-developer/answer/14151465?hl=es-419): las cuentas personales nuevas descritas en la guía necesitan al menos 12 participantes durante 14 días continuos antes de solicitar producción.
- [Apple Developer](https://developer.apple.com/programs/whats-included/): tarifa publicada de 99 USD por año.
- [Supabase: precios](https://supabase.com/pricing): plan gratuito limitado y Pro desde 25 USD/mes.

Los precios y requisitos se consultaron el 2026-10-30 y deben verificarse otra vez antes del registro o compra. Las dos cuentas de tienda sumarían 124 USD en el primer año, antes de otros gastos aplicables.
