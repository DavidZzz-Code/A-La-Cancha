# Perfil y apariencia móvil

La pantalla Mi cuenta usa datos de la sesión autenticada. Nombre, ciudad y biografía se guardan mediante `auth.updateUser`; estos metadatos son únicamente de presentación, nunca permisos. El acceso del propietario continúa dependiendo de `venue_members` y las operaciones protegidas del servidor.

- Tema claro, oscuro y sistema: `src/lib/theme.tsx`, persistencia local y barra de estado adaptada. Android declara apariencia automática y expo-system-ui.
- Perfil: portada ilustrada, iniciales, edición de datos, contraseña y cierre de sesiones. No se inventa una lista de dispositivos: se identifica la sesión actual y se ofrece cerrar las demás.
- Favoritos: IDs del catálogo remoto, almacenados localmente por cuenta. No se sincronizan entre dispositivos. El catálogo demo no alimenta estos favoritos.
- Inicio: buscador abre mapa; catálogo con precio y capacidad del servidor; próximo partido consulta exclusivamente reservas confirmadas futuras.
- Propietarios: se conservan accesos a agenda, ubicación y edición de precios, apertura y capacidad.
- Navegación del jugador: Canchas, Mis reservas, Mi cuenta. No se repite Buscar en la barra inferior.

Los mockups son referencia visual. Las fotos generadas no representan las sedes reales: esta entrega utiliza ilustraciones deportivas y no inventa fotografías ni partidos. La subida de avatar/portada y las fotos autorizadas de sedes quedan pendientes.
