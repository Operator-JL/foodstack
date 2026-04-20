# FoodStack

Proyecto full-stack con:
- Backend API en Flask + SQL Server.
- Frontend estático (HTML/CSS/JS) servido por Flask en producción.

## 1. Requisitos locales

- Python 3.11+
- ODBC Driver 18 for SQL Server
- SQL Server / Azure SQL con el esquema esperado por los modelos

## 2. Instalación local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Configuración de entorno

1. Crea `.env` a partir de `.env.example`.
2. Completa credenciales reales de base de datos.

Variables mínimas:
- `SQL_SERVER`
- `DATABASE`
- `SQL_USER`
- `SQL_PASSWORD`
- `JWT_SECRET_KEY` (recomendado)
- `FLASK_SECRET_KEY` (recomendado)

## 4. Ejecución

### Backend + frontend (modo integrado recomendado)

```bash
python app.py
```

Rutas principales:
- Frontend: `http://127.0.0.1:5000/`
- API health: `http://127.0.0.1:5000/api/test`

Con este modo, frontend y API comparten origen y la sesión autenticada funciona mejor.

### Frontend con Live Server (opcional)

Puedes abrir `frontend/` con Live Server, pero:
- se recomienda apuntar API a backend local o Azure mediante `runtime-config.js`
- para QA real, preferir frontend servido por Flask para evitar problemas de sesión/cookies cross-origin

## 5. Configuración del frontend (local vs Azure + demo mode)

Archivo central: `frontend/js/runtime-config.js`

Parámetros:
- `API_BASE_URL`: vacío = resolución automática.
- `DEV_FALLBACK_MODE`: `true/false` (fallback de datos demo).
- `ALLOW_DEMO_AUTH`: `true/false` (botones de demo login).
- `REQUEST_CREDENTIALS`: `same-origin` recomendado.

### Cambiar API rápidamente

Opción A: editar `API_BASE_URL` en `runtime-config.js`.

Opción B: desde consola del navegador:

```js
localStorage.setItem('foodstack-api-base-url', 'https://TU-API.azurewebsites.net/api')
location.reload()
```

Volver a automático:

```js
localStorage.removeItem('foodstack-api-base-url')
location.reload()
```

### Activar/desactivar demo explícitamente

```js
localStorage.setItem('foodstack-demo-mode', '1') // activar
localStorage.setItem('foodstack-demo-mode', '0') // desactivar
location.reload()
```

También puedes usar query string:
- `?demo=1` activa
- `?demo=0` desactiva

## 6. Seguridad y autenticación (resumen)

- Login devuelve JWT (también en cookie `auth_token`).
- El frontend adjunta `Authorization: Bearer <token>` automáticamente cuando existe.
- Endpoints sensibles (órdenes/admin) requieren autenticación.
- Signup público fuerza rol `customer` en backend (no confía en rol enviado por cliente).
- Vistas staff validan sesión con backend (`/api/session`) y no solo con `localStorage`.

## 7. Azure App Service

La raíz `/` ahora sirve `frontend/login.html` (ya no texto plano).
Los endpoints siguen bajo `/api/*`.

Verifica en Azure:
- App Settings con variables de entorno SQL/JWT/FLASK.
- Logs de app para errores de conexión SQL.
- Deploy del repositorio completo (incluye carpeta `frontend`).

## 8. Checklist mínimo de smoke test

1. Abrir `/` y confirmar que carga login de FoodStack.
2. `GET /api/test` -> status ok.
3. Login customer -> `home.html`.
4. Login staff -> `staff-home.html`.
5. Crear orden en `cart.html`.
6. Cambiar status de orden en dashboard staff.
7. Probar `PUT /api/user/<id>`.
