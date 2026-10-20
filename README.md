# Multibuscador

Comparador de precios que busca un producto en siete tiendas a la vez y muestra
una tarjeta por tienda con foto, título, precio y enlace.

Tiendas incluidas:

- Alcampo
- MediaMarkt Canarias
- Nalber
- El Faro Electrónica (La Laguna)
- Lalo Electrónica
- App Informática
- Leroy Merlin (con stock de la tienda de La Laguna)

> Proyecto local. No hay base de datos, cuentas de usuario ni claves de API.

## Cómo funciona

El frontend envía la búsqueda a `GET /api/search?q=...`. El servidor lanza los
siete adaptadores en paralelo con un timeout de 8 segundos. Cada adaptador obtiene
el catálogo público de su tienda, extrae los productos y los normaliza. Después
se puntúan por relevancia y se devuelven hasta cinco resultados por tienda.

Si una tienda falla, la respuesta sigue siendo válida: esa tarjeta explica qué
ha pasado y las demás conservan sus resultados. Las búsquedas se cachean en
memoria durante 10 minutos y las peticiones simultáneas idénticas se comparten.

## Requisitos

- Node.js 20.19 o superior
- pnpm 10 o superior

## Instalación y desarrollo

```bash
pnpm install
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787
- Vite redirige `/api` al backend.

Para ejecutar solo una parte:

```bash
pnpm dev:web
pnpm dev:api
```

## Build y ejecución local

```bash
pnpm build
pnpm start
```

La build queda en `dist/` y el servidor compilado en `dist-server/`. `pnpm start`
sirve la web y la API en http://localhost:8787.

El puerto se puede cambiar con `PORT`:

```bash
PORT=9000 pnpm start
```

## Comprobaciones

```bash
pnpm check:lines   # Ningún archivo escrito a mano supera 300 líneas
pnpm typecheck     # TypeScript estricto en frontend y backend
pnpm test          # Tests de parsers, matching y utilidades
pnpm build         # Typecheck + build de producción
pnpm verify        # Todo lo anterior en orden
```

## Caché compartida: una petición, muchos usuarios

Lalesson más importante (la misma que aplicaste a AEMET en DeBelingo): **no
puede ser cada usuario el que pide el dato a la tienda**. Si cada visita (y cada
instancia serverless) consulta a Alcampo o Leroy Merlin, el volumen de peticiones
dispara sus protecciones anti-bot.

Con una caché compartida (Vercel KV o Upstash) el flujo es:

```
usuario A → función Vercel → tiendas (1 petición) ─┐
usuario B → función Vercel → caché compartida ──────┴→ misma respuesta
usuario C → función Vercel → caché compartida
```

Las variables de entorno en Vercel (Settings → Environment Variables):

| Variable | Para qué sirve |
| --- | --- |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Vercel KV (Storage → KV) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Alternativa con Upstash |
| `CACHE_TTL_SECONDS` | Vida de la caché de búsquedas (600 por defecto) |

Sin KV la app sigue funcionando con la caché en memoria de cada instancia, pero
en serverless cada instancia nueva vuelve a preguntar a las tiendas. Cuanto más
alto `CACHE_TTL_SECONDS`, menos peticiones salen hacia las tiendas.

También se cachea el descubrimiento de productos de Leroy Merlin (24 h), para no
volver a descargar sus sitemaps públicos en cada petición.

## Fuentes de datos por tienda

| Tienda | Fuente | Formato | Protecciones |
| --- | --- | --- | --- |
| Alcampo | `compraonline.alcampo.es/search?q=` | JSON `productEntities` embebido | AWS WAF |
| MediaMarkt Canarias | `canarias.mediamarkt.es/search/suggest.json?q=` | JSON Shopify | ninguna |
| Nalber | `nalber.com/module/iqitsearch/searchiqit?s=` | HTML PrestaShop | ninguna |
| El Faro | `electronicaelfaro.com/index.php?route=product/search&search=` | HTML OpenCart | ninguna |
| Lalo | `laloelectronica.com/busqueda?s=` | HTML PrestaShop | ninguna |
| App Informática | API VTEX `catalog_system/pub/products/search?ft=` | JSON VTEX | ninguna |
| Leroy Merlin | `leroymerlin.es/sitemap-searchdex*.xml` + ficha de producto | XML + HTML | DataDome |

Leroy Merlin no expone un buscador abierto, así que el adaptador localiza la
familia de productos que coincide con la búsqueda en los sitemaps públicos y luego
lee la ficha de cada producto para obtener el precio y la disponibilidad en la
tienda de **La Laguna**. Esa disponibilidad aparece en la tarjeta con la etiqueta
"En stock en La Laguna" o "Sin stock en La Laguna".

## Protecciones anti-bot

Alcampo (AWS WAF) y Leroy Merlin (DataDome) bloquean el acceso automatizado desde
muchas IP. No se intenta saltarse esa protección: cuando ocurre, la tarjeta
indica qué ha pasado y el resto de tiendas sigue funcionando.

- **Alcampo**: pide una verificación humana interactiva. La app lo detecta,
  espera 2 minutos antes de volver a intentarlo y avisa de que la tienda pide
  verificación.
- **Leroy Merlin**: responde con un bloqueo (403). La tarjeta avisa de que el
  acceso automático está bloqueado y conviene reintentar más tarde.

Si una tienda está protegida, conviene abrir su web en el navegador con
normalidad y volver a probar la búsqueda.

### Proxy de scraping (variables de entorno en Vercel)

Como los bloqueos dependen de la IP de salida, puedes enrutar todas las
peticiones a las tiendas por un proxy. Lo único que tienes que hacer es pegar la
clave en *Vercel → Project Settings → Environment Variables* y redesplegar; la
app se encarga de armar la URL. La clave nunca llega al navegador.

| Variable | Servicio | Nota |
| --- | --- | --- |
| `SCRAPER_API_KEY` | ScraperAPI | Añade `SCRAPER_RENDER_JS=true` para usar un navegador real (ayuda con WAF/captcha) |
| `ZYTE_API_KEY` | Zyte | |
| `SCRAPINGBEE_API_KEY` | ScrapingBee | |
| `PROXY_STORES` | — | `alcampo,leroy-merlin`: solo esas dos tiendas van por el proxy, el resto en directo (ahorra créditos) |
| `PROXY_URL_TEMPLATE` | Cualquiera o proxy propio | Plantilla con `{url}`, `{url_raw}` y `{api_key}`; tiene prioridad sobre las anteriores |
| `PROXY_API_KEY` | Plantilla personalizada | |
| `PROXY_HEADERS` | Todos | Cabeceras extra en JSON |

En el log de la función verás `[proxy] consultas a las tiendas vía <servicio>`
cuando está activo.

## Despliegue en Vercel

El repositorio ya incluye lo necesario para publicar la web y la API en Vercel:

- `vercel.json` define el build de Vite, la función `api/[...path].ts` (Express
  completo en una sola función serverless) y el fallback de la SPA.
- `api/[...path].ts` exporta la app Express, de forma que `/api/search` y
  `/api/health` funcionan en el mismo dominio que la web.

Al ser funciones serverless, la caché en memoria y el deduplicado de
peticiones solo viven mientras la instancia esté caliente: para un volumen alto
conviene añadir una caché externa (Vercel KV o Redis).

Como las funciones salen desde IPs de datacenter, es probable que Alcampo y
Leroy Merlin muestren el aviso de bloqueo con más frecuencia que en local. La
variable `PROXY_URL_TEMPLATE` es la forma más sencilla de evitarlo.

## API

### `GET /api/health`

```json
{ "ok": true, "service": "multibuscador" }
```

### `GET /api/search?q=teclado`

```json
{
  "query": "teclado",
  "cached": false,
  "tookMs": 2450,
  "bestPrice": {
    "store": "nalber",
    "storeName": "Nalber",
    "price": 9.63
  },
  "results": [
    {
      "store": "leroy-merlin",
      "name": "Leroy Merlin",
      "shortName": "LM",
      "color": "#78be20",
      "status": "ok",
      "fetchedAt": "2026-10-20T10:00:00.000Z",
      "tookMs": 1200,
      "products": [
        {
          "title": "Teclado Logitech K120",
          "price": 13.5,
          "currency": "EUR",
          "imageUrl": "https://...",
          "productUrl": "https://...",
          "availability": {
            "store": "La Laguna",
            "inStock": true,
            "text": "A partir de 2 días La Laguna GRATIS"
          }
        }
      ]
    }
  ]
}
```

`status` puede ser `ok`, `empty` o `error`. En `error` se incluye un mensaje
apto para mostrar al usuario. La respuesta siempre contiene las siete tiendas.

Límites: 40 peticiones por minuto y por IP, consulta de 2 a 80 caracteres.

## Estructura

```text
src/
  components/       Tarjetas, buscador, estados y resumen
  hooks/            Estado de búsqueda y abortos
  lib/              API, formato, historial y metadatos
  styles/           CSS dividido en base, layout, componentes, estados y resultados
server/
  adapters/         Un archivo por tienda y parser PrestaShop común
  lib/              HTTP, caché, matching, rate limit, sitemaps, texto y JSON
  routes/           Endpoint de búsqueda
  services/         Búsqueda paralela, timeout, caché y mejor precio
  __fixtures__/     HTML/JSON/XML para tests
shared/
  types.ts          Tipos compartidos
scripts/
  check-file-length.mjs
```

## Añadir una tienda

1. Crea `server/adapters/mi-tienda.ts` con un `StoreAdapter`.
2. Exporta una función `parseMiTienda` que reciba HTML/JSON y devuelva `Product[]`.
3. Usa `fetchText`/`fetchJson` y pasa el `AbortSignal`.
4. Añade el adaptador a `server/adapters/registry.ts`.
5. Añade el identificador a `StoreId` en `shared/types.ts` y a `STORE_META` en
   `src/lib/stores.ts`.
6. Añade un fixture y un test del parser.
7. Ejecuta `pnpm verify` y prueba la búsqueda real.

## Tests

```bash
pnpm test
pnpm test:watch
```

Los tests no hacen peticiones de red. Usan fixtures de `server/__fixtures__/`
para comprobar los parsers de Alcampo, MediaMarkt Canarias, Nalber, Lalo, El Faro,
App Informática y Leroy Merlin, además del matching, los precios, la extracción de
JSON y la detección de bloqueos anti-bot.

## CI y Dependabot

`.github/workflows/ci.yml` ejecuta el límite de líneas, typecheck, tests y build
en cada push y pull request.

`.github/dependabot.yml` revisa dependencias npm y GitHub Actions cada lunes a
las 06:00 (Europe/Madrid). Las actualizaciones npm de tipo major se ignoran para
evitar cambios incompatibles automáticos.

## Regla de las 300 líneas

Ningún archivo escrito a mano supera 300 líneas. La comprobación se ejecuta con:

```bash
pnpm check:lines
```

Quedan excluidos `pnpm-lock.yaml`, `dist/`, `dist-server/`, `node_modules/` y
`server/__fixtures__/`.

## Aviso

Los precios son orientativos, pueden cambiar y no incluyen gastos de envío.
Multibuscador no está afiliado a las tiendas. Los datos proceden de sus catálogos
online públicos; revisa siempre el precio final antes de comprar.
