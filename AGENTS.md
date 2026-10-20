# AGENTS.md

Guía para personas y agentes que trabajen en **Multibuscador**.

## Qué es

Aplicación web que recibe el nombre de un producto y muestra, en paralelo, una
foto, un título, un precio y un enlace de cada una de estas tiendas:

- Alcampo
- MediaMarkt Canarias
- Nalber
- El Faro Electrónica (La Laguna)
- Lalo Electrónica
- App Informática
- Leroy Merlin (con el stock de la tienda de La Laguna)

El proyecto funciona en local. No hay base de datos ni claves de API.

## Stack

- **Frontend:** React 19, TypeScript, Vite.
- **Backend:** Node.js, Express 5, TypeScript, Cheerio.
- **Tests:** Vitest.
- **Gestor de paquetes:** pnpm.
- **CI:** GitHub Actions.
- **Dependencias:** Dependabot.

## Regla de las 300 líneas

Ningún archivo escrito a mano puede superar **300 líneas**.

Incluye `src/`, `server/`, `scripts/`, configuración, documentación y workflows.
Quedan fuera `pnpm-lock.yaml`, `dist/`, `dist-server/`, `node_modules/` y los
fixtures de `server/__fixtures__/`.

Antes de terminar cualquier cambio:

```bash
pnpm check:lines
```

Si un archivo se acerca al límite, divídelo por responsabilidad. No uses
minificado, líneas artificialmente largas ni comentarios para esquivar la regla.

## Comandos

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Vite en :5173 + API en :8787
pnpm dev:web          # Solo frontend
pnpm dev:api          # Solo API
pnpm check:lines      # Verificar el límite de 300 líneas
pnpm typecheck        # TypeScript de frontend y servidor
pnpm test             # Tests de Vitest
pnpm test:watch       # Tests en modo watch
pnpm build            # Typecheck + build de Vite + tsc del servidor
pnpm start            # Servir la build en :8787
pnpm verify           # check:lines + typecheck + test + build
```

## Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `PORT` | Puerto del servidor Express (8787 por defecto) |
| `VITE_API_URL` | URL de la API que llama el navegador (vacío = mismo dominio) |
| `ALLOWED_ORIGIN` | Orígenes permitidos por CORS |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Caché compartida (Vercel KV) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Caché compartida (Upstash) |
| `CACHE_TTL_SECONDS` | Vida de la caché de búsquedas (600 por defecto) |
| `ALCAMPO_PROXY` | Proxy solo para Alcampo (clave o URL de proxy) |
| `LEROY_MERLIN_PROXY` | Proxy solo para Leroy Merlin (clave o URL de proxy) |

Si se define `ALCAMPO_PROXY` o `LEROY_MERLIN_PROXY`, solo esas tiendas van por el
proxy, lo que evita los bloqueos por IP de AWS WAF (Alcampo) y DataDome (Leroy
Merlin). Las demás tiendas van siempre en directo. La clave nunca se expone al
cliente.

Si hay caché compartida (KV/Upstash), una sola petición a las tiendas sirve a
todos los usuarios: es la forma más efectiva de no disparar los bloqueos. No
añadas dependencias para la caché: `server/lib/kv.ts` habla con la API REST.

## Despliegue

- **Vercel**: `vercel.json` + `api/[...path].ts` publican la web y la API en el
  mismo dominio. En serverless la caché en memoria solo vive en instancias
  calientes.
- **Local**: `pnpm dev` o `pnpm build && pnpm start`. Es la opción con menos
  bloqueos porque sale desde una IP residencial.

## Estructura

```text
src/                  Interfaz React
  components/         Componentes de la UI
  hooks/              Estado de búsqueda
  lib/                API, formato, historial y metadatos de tiendas
  styles/             CSS dividido por responsabilidad
server/
  adapters/           Un adaptador por tienda + parser PrestaShop común
  lib/                HTTP, caché, matching, validación, rate limit y texto
  routes/             Rutas HTTP
  services/           Orquestación de búsquedas
  __fixtures__/       HTML/JSON de ejemplo para tests
shared/types.ts       Tipos compartidos por frontend y backend
scripts/              Utilidades de desarrollo
```

## Flujo de una búsqueda

1. `GET /api/search?q=...` valida la consulta.
2. `search-service.ts` consulta los seis adaptadores en paralelo.
3. Cada adaptador tiene un máximo de 8 segundos.
4. Si una tienda falla, las demás siguen y se devuelve un resultado parcial.
5. Los productos se normalizan, puntúan y ordenan con `lib/matching.ts`.
6. La respuesta se guarda 10 minutos en una caché en memoria.
7. Las peticiones simultáneas de la misma consulta comparten la misma promesa.

## Adaptadores

Todos implementan `StoreAdapter` (`server/adapters/types.ts`):

```ts
export const ejemploAdapter: StoreAdapter = {
  id: 'ejemplo',
  name: 'Ejemplo',
  shortName: 'E',
  color: '#123456',
  async search(query, signal) {
    const html = await fetchText(url, signal);
    return parseEjemplo(html);
  }
};
```

Reglas:

- Exporta el parser (`parseX`) para poder testearlo sin red.
- Usa `fetchText` o `fetchJson` de `lib/http.ts`; no llames a `fetch` directamente.
- Pasa siempre el `AbortSignal` para respetar el timeout.
- Devuelve solo productos con título, precio positivo y URL.
- Convierte URLs relativas con `absoluteUrl` y fuerza HTTPS si el sitio lo admite.
- Limpia duplicados con `dedupeProducts`.
- No inventes precios ni productos de relleno.
- Registra el adaptador en `server/adapters/registry.ts`.

### Fuentes actuales

| Tienda | Fuente | Formato |
| --- | --- | --- |
| Alcampo | `compraonline.alcampo.es/search?q=` | JSON `productEntities` embebido |
| MediaMarkt Canarias | `canarias.mediamarkt.es/search/suggest.json?q=` | JSON Shopify |
| Nalber | `nalber.com/module/iqitsearch/searchiqit?s=` | HTML PrestaShop |
| El Faro | `electronicaelfaro.com/index.php?route=product/search&search=` | HTML OpenCart |
| Lalo | `laloelectronica.com/busqueda?s=` | HTML PrestaShop |
| App Informática | API VTEX `catalog_system/pub/products/search?ft=` | JSON VTEX |
| Leroy Merlin | `leroymerlin.es/sitemap-searchdex*.xml` + ficha de producto | XML + HTML |

Los scrapers dependen del HTML de terceros. Si una tienda cambia su marcado,
actualiza su parser, añade o ajusta el fixture y ejecuta `pnpm test`.

### Alcampo y la protección anti-bot

Alcampo está detrás de AWS WAF y, si detecta demasiado tráfico, responde con una
página de verificación humana (`202` o el texto `challenge-container`). El
adaptador detecta esa situación, espera 5 minutos antes de volver a intentarlo y
devuelve un error claro en lugar de fingir que no hay productos. No intentes
saltarte el reto: la tarjeta debe explicar qué ocurre y las demás tiendas deben
seguir respondiendo.

### Leroy Merlin y el stock en La Laguna

Leroy Merlin no ofrece un buscador abierto y usa DataDome. El adaptador solo
consume recursos publicados para buscadores: los sitemaps públicos
(`sitemap-searchdex1/2.xml`) para localizar la familia de productos que coincide
con la búsqueda y la ficha de producto (`/productos/...html`) para leer el precio
y la disponibilidad.

La disponibilidad se expone en `Product.availability` (`store`, `inStock`,
`text`). La tarjeta muestra "En stock en La Laguna", "Sin stock en La Laguna" o
"Stock en La Laguna no disponible" cuando la página no confirma el estado.

Si DataDome responde con 403, la app lo comunica como bloqueo de acceso
automático. No intentes evadirlo.

## Matching

`rankProducts` normaliza acentos, elimina palabras vacías y calcula cobertura de
términos. Añade bonus por frase exacta y penaliza accesorios o componentes como “funda”,
“cargador”, “módulo” o “matricial” cuando la consulta no los pide. Devuelve como máximo cinco productos
por tienda.

No cambies el matching solo para “hacer pasar” un caso: añade un test que
describa el comportamiento esperado.

## Frontend

- UI en español, responsive y sin framework CSS.
- Cada tarjeta muestra la tienda, la foto, el título, el precio y el enlace.
- Si hay más de un resultado, se pueden desplegar alternativas.
- Las imágenes se enlazan directamente con `referrerPolicy="no-referrer"` y
  tienen un placeholder si fallan.
- El historial se guarda en `localStorage` (máximo 6 búsquedas).
- La consulta se refleja en `?q=` para poder compartir o recargar la URL.

## Tests

- Los tests viven junto al código (`*.test.ts`).
- Los fixtures viven en `server/__fixtures__/`.
- Los parsers deben probarse con HTML/JSON representativo.
- No hagas tests que dependan de la red.
- Añade un test por cada bug de scraping que corrijas.

## Estilo

- TypeScript estricto.
- El servidor usa `NodeNext`: los imports relativos llevan extensión `.js`.
- El frontend usa resolución `Bundler`: imports sin extensión.
- Prefiere funciones pequeñas y nombres explícitos.
- Comentarios solo cuando aportan contexto; el código debe explicarse solo.
- No añadas dependencias si una función pequeña resuelve el problema.

## CI y Dependabot

`.github/workflows/ci.yml` ejecuta en cada push y pull request:

1. `pnpm check:lines`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

Dependabot revisa npm y GitHub Actions semanalmente. El revisor configurado es
`AngelTrujilloMarrero`.

## Antes de dar una tarea por terminada

```bash
pnpm verify
```

Además, si el cambio afecta a scraping, prueba una búsqueda real:

```bash
pnpm dev:api
curl 'http://localhost:8787/api/search?q=teclado'
```

Comprueba que las seis tiendas responden o fallan de forma controlada, que los
precios son números positivos y que los enlaces abren el producto correcto.
