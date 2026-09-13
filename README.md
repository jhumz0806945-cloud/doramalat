# DoramaLat

Página de inicio de una plataforma de streaming de doramas, dramas asiáticos y anime con doblaje y subtítulos en español latino.

Diseño original exportado de Stitch, adaptado a una página estática funcional (Tailwind CSS vía CDN, imágenes locales en [`images/`](images)).

## Ejecutar en local

Requiere Windows con PowerShell (no depende de Node ni Python; usa `System.Net.HttpListener`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1 -Port 5500
```

Luego abre [http://localhost:5500](http://localhost:5500) en el navegador.

## Estructura

- [`index.html`](index.html) — página principal.
- [`images/`](images) — imágenes del diseño (pósters, hero, avatares, logo).
- [`server.ps1`](server.ps1) — servidor estático local en PowerShell.
- [`stitch_duplicate_of_plataforma_streaming_doramas_latino/`](stitch_duplicate_of_plataforma_streaming_doramas_latino) — archivos de diseño originales exportados de Stitch (referencia).
