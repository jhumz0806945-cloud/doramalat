# DoramaLatAMP

Página de reseñas, tráilers y guías de dónde ver (legalmente) doramas, dramas asiáticos y anime, con doblaje y subtítulos en español latino. No aloja ni transmite video — enlaza a plataformas con licencia (Netflix, Viki, Crunchyroll, JustWatch).

Diseño original exportado de Stitch, adaptado a una página funcional (Tailwind CSS vía CDN, imágenes locales en [`images/`](images)) con un **backend real**: cuentas de usuario, buscador y filtros por género/país corriendo contra una API propia.

## Ejecutar en local (con backend real: cuentas, buscador, filtros)

Requiere [Node.js](https://nodejs.org/) 18+. La capa de datos usa [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts) (compatible con SQLite, sin dependencias nativas que compilar).

```powershell
npm install
npm start
```

Luego abre [http://localhost:5600](http://localhost:5600).

Al arrancar, `server/index.js` crea automáticamente `data/doramalatamp.db` (SQLite) con las tablas de usuarios, reseñas y favoritos, y siembra el catálogo desde [`server/data/series.js`](server/data/series.js). La carpeta `data/` no se versiona (contiene la base de datos y el secreto de firma de sesión, generados en el primer arranque).

### Qué es real hoy

- **Cuentas de usuario**: registro e inicio de sesión reales, con contraseñas *hasheadas* (bcrypt) y sesión persistente en cookie firmada (JWT). Botón de la esquina superior derecha.
- **Buscador**: escribe en la barra superior y busca contra la API (`/api/series?q=`).
- **Filtros por género y país**: en "Explora por Géneros & Países", cada botón/tarjeta consulta la API y muestra resultados reales (incluye estados vacíos honestos cuando no hay reseñas para ese filtro todavía).
- **Tarjetas de reseñas**: haz clic en cualquier póster para abrir el detalle completo (sinopsis, dónde verla, tráiler si existe).
- Los enlaces **"Ver Dónde Verla"** siguen siendo reales (JustWatch) — eso ya funcionaba antes y no cambió.

### Solo vista estática, sin backend

Si solo quieres previsualizar el diseño sin instalar Node (sin login/buscador/filtros funcionales), puedes seguir usando el servidor estático en PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1 -Port 5500
```

Luego abre [http://localhost:5500](http://localhost:5500).

## Desplegar en Vercel (dominio gratis `doramalatamp.vercel.app`)

1. Crea una base de datos gratis en **[Turso](https://turso.tech)** (o cualquier otro proveedor de libSQL): te da una `TURSO_DATABASE_URL` (empieza con `libsql://…`) y un `TURSO_AUTH_TOKEN`.
2. En [vercel.com](https://vercel.com), crea un proyecto nuevo importando este repositorio de GitHub. Ponle de nombre `doramalatamp` (define la URL `doramalatamp.vercel.app`).
3. En la configuración del proyecto → **Environment Variables**, agrega `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` con los valores del paso 1.
4. Deploy. Vercel sirve los archivos estáticos (`index.html`, `app.js`, `images/`) directamente y enruta `/api/*` a [`api/index.js`](api/index.js) (ver [`vercel.json`](vercel.json)), que reexporta la misma app de Express de [`server/app.js`](server/app.js).

Sin esas variables de entorno, la app sigue funcionando (usa un archivo SQLite local), pero en Vercel ese archivo se borra entre invocaciones — las cuentas de usuario no persistirían.

## Estructura

- [`index.html`](index.html) — página principal.
- [`app.js`](app.js) — lógica de cliente: sesión, buscador, filtros, modal de detalle.
- [`server/`](server) — backend Express: `app.js` (la app, sin `listen`), `index.js` (arranque local), `db.js` (acceso a datos vía `@libsql/client`), `routes/auth.js` y `routes/series.js` (API), `data/series.js` (catálogo, fuente única de datos).
- [`api/index.js`](api/index.js) — punto de entrada de la función serverless de Vercel (reexporta `server/app.js`).
- [`vercel.json`](vercel.json) — enruta `/api/*` hacia la función serverless.
- [`images/`](images) — imágenes del diseño (pósters, hero, avatares, logo).
- [`server.ps1`](server.ps1) — servidor estático local en PowerShell (fallback sin backend).
- [`stitch_duplicate_of_plataforma_streaming_doramas_latino/`](stitch_duplicate_of_plataforma_streaming_doramas_latino) — archivos de diseño originales exportados de Stitch (referencia).

## Próximos pasos sugeridos

- Recuperación de contraseña (hoy no existe flujo de "olvidé mi contraseña").
- Favoritos: la tabla `favorites` ya existe en la base de datos pero todavía no tiene endpoints ni UI.
