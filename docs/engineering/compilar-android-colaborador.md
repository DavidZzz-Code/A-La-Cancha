# Compilar Android 0.1.15 desde GitHub

Desde la raíz de la rama release/android-0.1.15:

    npm ci
    cd apps/mobile
    npx eas-cli login
    npx eas-cli whoami

Para colaborar en el proyecto de jesump28, el titular debe invitar al colaborador con permiso de compilación. Mantener el projectId existente en app.json. La cuota corresponde al proyecto y su cuenta propietaria.

Para distribuir desde un proyecto propio autorizado, crear el proyecto en el panel de Expo del colaborador. En una rama propia, establecer expo.owner en apps/mobile/app.json al nombre de esa cuenta y reemplazar expo.extra.eas.projectId por el UUID del proyecto nuevo. Hacer coincidir también expo.slug con el slug del proyecto. Conservar android.package y la versión definida en app.config.js. Verificar la vinculación:

    npx eas-cli project:info

En el entorno preview del proyecto de destino, configurar GOOGLE_MAPS_ANDROID_API_KEY. La API de Maps para Android debe admitir el paquete y la huella de firma que vaya a utilizarse. El perfil preview ya apunta al backend del piloto con la clave pública del cliente. Las reservas se guardan en ese backend compartido.

Para que Android acepte actualizar la instalación de jesump28, usar el mismo certificado de firma. El titular puede administrar las credenciales mediante eas credentials -p android y aprovisionar la firma en el proyecto destino por un canal privado. No subir el keystore, contraseñas ni credentials.json al repositorio. Para pruebas independientes con firma propia usar otro android.package y registrar ese paquete y certificado en Google Maps.

    npx eas-cli build --platform android --profile preview

La página de la compilación ofrece el APK cuando termina. El perfil preview genera distribución interna. Antes de distribuir verificar que indica 0.1.15 (16).
