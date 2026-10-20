# Multibuscador

Comparador de precios que busca un producto en cinco tiendas a la vez y muestra
una tarjeta por tienda con foto, título, precio y enlace.

Tiendas incluidas:

- MediaMarkt Canarias
- Nalber
- El Faro Electrónica (La Laguna)
- Lalo Electrónica
- App Informática

> Proyecto local. No hay base de datos, cuentas de usuario ni claves de API.

## Cómo funciona

El frontend envía la búsqueda a `GET /api/search?q=...`. El servidor lanza los
cinco adaptadores en paralelo con un timeout de 8 segundos. Cada adaptador
obtiene el catálogo público de su tienda, extrae los productos y los normaliza.
Después se puntúan por relevancia y se devuelven hasta cinco resultados por
tienda.

Si una tienda falla, la respuesta sigue siendo válida: esa tarjeta explica qué
ha pasado y las demás conservan sus resultados. Las búsquedas se cachean en
memoria durante 10 minutos y las peticiones simultáneas idénticas se comparten.

No se incluyen tiendas que bloquean el acceso automatizado. Alcampo (AWS WAF) y
Leroy Merlin (DataDome) se retiraron tras comprobar que devolvían bloqueos o
captchas de forma sistemática: hacían más lenta la búsqueda y nunca garantizaban
un precio fiable.

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

Con una caché compartida (Upstash/Redis) el flujo es:

```
usuario A → servidor → tiendas (1 petición) ─┐
usuario B → servidor → caché compartida ──────┴→ misma respuesta
usuario C → servidor → caché compartida
```

Variables de entorno:

| Variable | Para qué sirve |
| --- | --- |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | Caché compartida (Upstash/Redis) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Alternativa con Upstash |
| `CACHE_TTL_SECONDS` | Vida de la caché de búsquedas (600 por defecto) |

Sin caché compartida la app sigue funcionando con la caché en memoria del
servidor.

## Fuentes de datos por tienda

| Tienda | Fuente | Formato |
| --- | --- | --- |
| MediaMarkt Canarias | `canarias.mediamarkt.es/search/suggest.json?q=` | JSON Shopify |
| Nalber | `nalber.com/module/iqitsearch/searchiqit?s=` | HTML PrestaShop |
| El Faro | `electronicaelfaro.com/index.php?route=product/search&search=` | HTML OpenCart |
| Lalo | `laloelectronica.com/busqueda?s=` | HTML PrestaShop |
| App Informática | API VTEX `catalog_system/pub/products/search?ft=` | JSON VTEX |

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
  "tookMs": 1450,
  "bestPrice": { "store": "nalber", "storeName": "Nalber", "price": 9.63 },
  "results": [
    {
      "store": "mediamarkt",
      "name": "MediaMarkt Canarias",
      "status": "ok",
      "tookMs": 820,
      "products": [
        {
          "title": "Teclado inalámbrico SilverHT",
          "price": 19.99,
          "currency": "EUR",
          "imageUrl": "https://...",
          "productUrl": "https://..."
        }
      ]
    }
  ]
}
```

`status` puede ser `ok`, `empty` o `error`. En `error` se incluye un mensaje
apto para mostrar al usuario. La respuesta siempre contiene las cinco tiendas.

Límites: 40 peticiones por minuto y por IP, consulta de 2 a 80 caracteres.

## Estructura

```text
src/                  Frontend React
  components/         Componentes de la UI
  hooks/              Estado de búsqueda
  lib/                API, formato, historial y metadatos de tiendas
  styles/             CSS dividido por responsabilidad
server/
  adapters/           Un adaptador por tienda + parser PrestaShop común
  lib/                HTTP, caché, matching, validación, rate limit y texto
  routes/             Rutas HTTP
  services/           Orquestación de búsquedas
  __fixtures__/       HTML/JSON de ejemplo para los tests
shared/types.ts       Tipos compartidos por frontend y backend
scripts/              check-file-length
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

La tienda debe responder sin captchas ni bloqueos desde una IP residencial. Si
no lo hace, no merece la pena integrarla: rompe la promesa de resultados
completos y ralentiza al resto.

## Tests

```bash
pnpm test
pnpm test:watch
```

Los tests no hacen peticiones de red. Usan fixtures de `server/__fixtures__/`
para comprobar los parsers de MediaMarkt Canarias, Nalber, Lalo, El Faro y App
Informática, además del matching, los precios, la extracción de JSON y la
detección de bloqueos.

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
