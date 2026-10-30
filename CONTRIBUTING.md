# Cómo trabajar en el proyecto

## Antes de cambiar algo

Buscar en los [issues](https://github.com/DavidZzz-Code/A-La-Cancha/issues) y en el [índice](docs/README.md). Si existe una tarea equivalente, continuar allí. Para una función nueva, explicar el problema, el alcance y cómo sabremos que está terminada.

## Ramas y revisiones

- `main`: base compartida y cambios revisados.
- `feat/<numero>-<nombre>`: funcionalidades.
- `fix/<numero>-<nombre>`: correcciones.
- `docs/<numero>-<nombre>`: documentación.
- `chore/<numero>-<nombre>`: herramientas y mantenimiento.

Ejemplo: `feat/12-search-by-date`. Una rama por tarea; evitar una rama permanente por persona.

Abrir un pull request hacia `main`. Usar `Closes #numero` solo si entrega todos los criterios del issue; usar `Refs #numero` si entrega una parte. No cerrar una tarea por haber creado sus carpetas.

## Organización del código

- `app/` dentro de la app Expo: rutas y composición.
- `src/features/<funcionalidad>/`: pantallas, componentes, hooks y acceso a datos propios de esa funcionalidad.
- `src/components/`: componentes de presentación reutilizados de verdad.
- `src/lib/`: clientes de servicios y configuración común.
- `packages/domain/`: contratos y reglas independientes de React.
- `supabase/`: permisos, persistencia y operaciones que necesitan garantías del servidor.

No enviar lógica específica a una carpeta genérica `utils` ni duplicar una regla entre aplicaciones.

## Listo para revisar

- Se cumplen los criterios de aceptación y se enlaza el issue.
- Se informa la verificación realizada; si no se pudo ejecutar, se explica el límite.
- Los cambios visuales incluyen capturas relevantes cuando ya exista interfaz.
- Se contemplan carga, errores y estados vacíos.
- Se actualizan documentación y migraciones cuando corresponda.
- No se añaden secretos ni datos personales reales.

Las protecciones de rama y la integración continua deben configurarse cuando exista código ejecutable; esta guía por sí sola no las activa.
