# Plan 100 % gratuito

Resumen de lo que cuesta cero y qué está probado (octubre 2026).

## 1. Caché compartida (0 €)

Vercel KV / Upstash tienen plan gratuito y **no hay que escribir ninguna
variable**: al conectar el store al proyecto, Vercel las inyecta.

```bash
# En Vercel: Storage → Create Database → KV → Connect to project → Redeploy
```

Con KV, una sola petición a las tiendas sirve a todos los usuarios. Es la
medida que más reduce los bloqueos, porque el volumen hacia Alcampo y Leroy
Merlin deja de multiplicarse por usuario × instancia serverless.

Variable opcional: `CACHE_TTL_SECONDS=3600` para servir más tiempo desde caché.

## 2. Alcampo (0 €) ✅ funciona

El bloqueo de Alcampo es de AWS WAF y depende del **volumen** de peticiones, no
de la IP. Medidas:

- Verificado: 6 peticiones seguidas seguidas con las cabeceras de `grocery-cli`
  → 200 con el JSON de `productEntities` en las 6.
- Con la caché compartida el volumen baja a 1 petición por búsqueda y TTL.
- Si aun así salta la verificación humana, la tarjeta lo avisa y reintenta a
  los 2 minutos.

## 3. Leroy Merlin (0 € con navegador en casa)

DataDome bloquea cualquier cliente que no sea un navegador (también desde una IP
residencial: comprobado, 403 en el HTML y 200 en los sitemaps). Por eso el
precio no se puede leer con `fetch` normal.

Opción gratuita: **recoger los datos en casa con tu Chrome** y compartirlos por
el KV.

```bash
# 1) Una sola vez: valida el perfil de Leroy Merlin con tu navegador
pnpm leroy:login

# 2) Cada búsqueda que quieras tener en la web
pnpm leroy:sync "teclado"
```

`leroy:login` abre Chrome con un perfil propio (`.chrome-leroy/`) para que
completes la verificación de DataDome. `leroy:sync` vuelve a lanzar Chrome sin
ventana, extrae precio y stock de La Laguna de cada ficha y lo guarda en el KV
con la clave `lm:productos:<consulta>`.

La función de Vercel lee esa clave y sirve el resultado sin tocar la web de
Leroy Merlin. Coste: 0 €.

## 4. Servicios externos con plan gratuito (0 €)

| Servicio | Gratis | Notas |
| --- | --- | --- |
| ScraperAPI | 1.000 créditos/mes (prueba de 7 días con 5.000) | 1 crédito por URL; con navegador real cuesta 10 |
| ScrapingBee | 1.000 créditos | 1 crédito por URL, 5 con JS |
| ZenRows | 5.000 créditos/mes | proxies residenciales + navegador |
| Apify | 5 USD de uso al mes | actor de navegador + proxies |

Se usan con las variables `ALCAMPO_PROXY` y `LEROY_MERLIN_PROXY` (clave o URL
completa del proxy). Con la caché de KV, 1.000 créditos/mes dan para muchas
búsquedas: cada búsqueda de Leroy Merlin son ~6 URLs (familia + fichas).

## 5. Lo que NO funciona (probado)

| Servicio | Resultado |
| --- | --- |
| `r.jina.ai` sin clave | Devuelve la página de verificación de DataDome; su motor de navegador exige API key (401) |
| `api.allorigins.win` / `api.codetabs.com` | 522/403 al pedir Leroy Merlin |
| `cors.isomorphic-git.org` | 403 (DataDome) |
| API de marketplace de Leroy Merlin | Existe (`batkor/leroy_merlin` en GitHub) pero es para vendedores: pide login, contraseña y apiKey |
| Sitemaps de Leroy Merlin | ✅ funcionan siempre: sirven para descubrir productos, no para el precio |

## Resumen

- Vercel: gratis (plan Hobby).
- KV: gratis.
- Alcampo: gratis con la caché.
- Leroy Merlin: gratis con `pnpm leroy:login` + `pnpm leroy:sync` en casa.
- Si prefieres no tocar tu máquina, el plan gratuito de ScraperAPI/ScrapingBee
  (1.000 créditos) cubre un volumen bajo.
