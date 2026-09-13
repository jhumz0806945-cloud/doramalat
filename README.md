# DoramaLatAMP

Página de reseñas, tráilers y guías de dónde ver (legalmente) doramas, dramas asiáticos y anime, con doblaje y subtítulos en español latino. No aloja ni transmite video — enlaza a plataformas con licencia (Netflix, Viki, Crunchyroll, JustWatch).

Diseño original exportado de Stitch, adaptado a una página funcional (Tailwind CSS vía CDN, imágenes locales en [`images/`](images)) con un **backend real**: cuentas de usuario, buscador y filtros por género/país corriendo contra una API propia.

## Ejecutar en local (con backend real: cuentas, buscador, filtros)

Requiere [Node.js](https://nodejs.org/) 22.5+ (usa el módulo `node:sqlite` incluido en Node, sin dependencias nativas que compilar).

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

## Estructura

- [`index.html`](index.html) — página principal.
- [`app.js`](app.js) — lógica de cliente: sesión, buscador, filtros, modal de detalle.
- [`server/`](server) — backend Express: `index.js` (servidor + estáticos), `db.js` (SQLite), `routes/auth.js` y `routes/series.js` (API), `data/series.js` (catálogo, fuente única de datos).
- [`images/`](images) — imágenes del diseño (pósters, hero, avatares, logo).
- [`server.ps1`](server.ps1) — servidor estático local en PowerShell (fallback sin backend).
- [`stitch_duplicate_of_plataforma_streaming_doramas_latino/`](stitch_duplicate_of_plataforma_streaming_doramas_latino) — archivos de diseño originales exportados de Stitch (referencia).

## Próximos pasos sugeridos

- HTTPS + cookie `secure: true` antes de desplegar a un dominio público (ver comentario en [`server/routes/auth.js`](server/routes/auth.js)).
- Recuperación de contraseña (hoy no existe flujo de "olvidé mi contraseña").
- Favoritos: la tabla `favorites` ya existe en la base de datos pero todavía no tiene endpoints ni UI.
