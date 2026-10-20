# Multibuscador

Comparador de precios que busca un producto en seis tiendas a la vez y muestra
una tarjeta por tienda con foto, título, precio y enlace.

Tiendas incluidas:

- Alcampo
- MediaMarkt
- Nalber
- El Faro Electrónica (La Laguna)
- Lalo Electrónica
- App Informática

> Proyecto local. No hay base de datos, cuentas de usuario ni claves de API.

## Cómo funciona

El frontend envía la búsqueda a `GET /api/search?q=...`. El servidor lanza los
seis adaptadores en paralelo con un timeout de 8 segundos. Cada adaptador obtiene
el catálogo público de su tienda, extrae los productos y los normaliza. Después
se puntúan por relevancia y se devuelven hasta cinco resultados por tienda.

Si una tienda falla, la respuesta sigue siendo válida: esa tarjeta muestra el
error y las demás conservan sus resultados. Las búsquedas se cachean en memoria
durante 10 minutos y las peticiones simultáneas idénticas se comparten.

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
    "store": "app-informatica",
    "storeName": "App Informática",
    "price": 9.99
  },
  "results": [
    {
      "store": "alcampo",
      "name": "Alcampo",
      "shortName": "A",
      "color": "#e30613",
      "status": "ok",
      "fetchedAt": "2026-10-20T10:00:00.000Z",
      "tookMs": 1200,
      "products": [
        {
          "title": "Teclado Logitech K120",
          "price": 12.9,
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
apto para mostrar al usuario. La respuesta siempre contiene las seis tiendas.

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
  lib/              HTTP, caché, matching, rate limit, texto y JSON
  routes/           Endpoint de búsqueda
  services/         Búsqueda paralela, timeout, caché y mejor precio
  __fixtures__/     HTML/JSON para tests
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
para comprobar los parsers de Alcampo, MediaMarkt, Nalber, Lalo, El Faro y App
Informática, además del matching, los precios y la extracción de JSON.

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

Alcampo usa una protección anti-bot (AWS WAF). Si la activa, su tarjeta mostrará
que pide verificación humana y el resto de tiendas seguirá funcionando con
normalidad.
