# Cuentas de desarrollo

Cliente Supabase opcional: si no hay variables, no se crea conexión y la demo funciona igual. Configuración inválida produce un aviso, sin imprimir credenciales. Solo se admiten URL HTTPS y claves publicables modernas.

AuthProvider restaura sesión, escucha cambios y controla renovación al cambiar el estado de la app. La sesión usa SecureStore nativo; en web, sessionStorage por pestaña. No se guardan contraseñas. Los permisos de propietario se consultarán mediante membresías del servidor, nunca mediante metadatos editables ni controles de interfaz.

AccountPanel permite iniciar y cerrar sesión con cuentas de prueba existentes. No registra usuarios ni envía correos. Registro, recuperación, perfil y reservas remotas siguen pendientes en #6/#9. Restablecer demo borra solo los datos ficticios, no la sesión; para salir existe Cerrar sesión.

Pendiente: validar sesión real, expiración, revocación, falta de conexión y tamaño de tokens en dispositivos Android/iOS. Las pruebas de configuración y exportaciones no sustituyen esas verificaciones. No usar este primer acceso de desarrollo como lanzamiento público.
