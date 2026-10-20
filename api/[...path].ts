import { createApp } from '../server/app.js';

/**
 * Función serverless de Vercel: expone la API Express completa.
 *
 * El fichero usa el nombre `[...path]` para que Vercel enrute cualquier
 * ruta `/api/...` (búsqueda, health, etc.) a esta misma función.
 */
export default createApp();
