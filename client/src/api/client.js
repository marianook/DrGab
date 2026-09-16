import * as httpApi from './httpApi.js';
import * as localApi from './localApi.js';

// Modo de datos: 'local' guarda todo en localStorage del navegador (para probar el
// frontend sin backend). 'remote' habla con la API real (server/).
// Cambiar a 'remote' definiendo VITE_API_MODE=remote en client/.env cuando el backend esté listo.
const MODO = import.meta.env.VITE_API_MODE === 'remote' ? 'remote' : 'local';
const impl = MODO === 'remote' ? httpApi : localApi;

export const api = impl.api;
export const getToken = impl.getToken;
export const setToken = impl.setToken;
export const ApiError = impl.ApiError;
export const MODO_API = MODO;
