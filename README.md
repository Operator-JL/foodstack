# FoodStack

Proyecto full-stack con:
- Backend API en Flask + SQL Server.
- Frontend estatico (HTML/CSS/JS) servido por Flask.

## 1) Requisitos locales

- Python 3.11+
- ODBC Driver 18 for SQL Server
- SQL Server o Azure SQL con el esquema esperado

## 2) Instalacion local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 3) Configuracion de entorno

1. Crear `.env` a partir de `.env.example`.
2. Completar credenciales reales de base de datos.

Variables minimas:
- `SQL_SERVER`
- `DATABASE`
- `SQL_USER`
- `SQL_PASSWORD`
- `JWT_SECRET_KEY` (recomendado)
- `FLASK_SECRET_KEY` (recomendado)

## 4) Ejecucion

### Backend + frontend (recomendado)

```bash
python app.py
```

Rutas principales:
- Frontend: `http://127.0.0.1:5000/`
- API health: `http://127.0.0.1:5000/api/test`

### Frontend con Live Server (opcional)

Se puede abrir `frontend/` con Live Server, pero para QA real se recomienda frontend servido por Flask.

## 5) Configuracion del frontend (local vs Azure)

Archivo central: `frontend/js/runtime-config.js`

Parametros:
- `API_BASE_URL`: vacio = resolucion automatica por origen.
- `REQUEST_CREDENTIALS`: `same-origin` recomendado.

Cambio rapido de API desde consola del navegador:

```js
localStorage.setItem('foodstack-api-base-url', 'https://TU-API.azurewebsites.net/api');
location.reload();
```

Volver a automatico:

```js
localStorage.removeItem('foodstack-api-base-url');
location.reload();
```

Nota: el flujo demo/test fue neutralizado. El catalogo opera contra API real.

## 6) Seguridad y autenticacion (resumen)

- Login devuelve JWT (tambien en cookie `auth_token`).
- El frontend adjunta `Authorization: Bearer <token>` cuando existe token.
- Endpoints sensibles requieren autenticacion y rol.
- Signup publico fuerza rol `customer` en backend.
- Vistas staff validan sesion con backend (`/api/session`).

## 7) Azure App Service

- La raiz `/` sirve `frontend/login.html`.
- Los endpoints API siguen bajo `/api/*`.

## 8) Smoke test minimo

1. Abrir `/` y confirmar login.
2. Probar `GET /api/test`.
3. Login customer -> `home.html`.
4. Login staff -> `staff-home.html`.
5. Crear orden en `cart.html`.
6. Cambiar status de orden en dashboard staff.
7. Probar `PUT /api/user/<id>`.

## 9) SQL de auditoria/limpieza de catalogo

Scripts manuales (no auto-ejecutables):
- `docs/sql/master_data_audit_cleanup.sql`
- `docs/sql/catalog_cleanup_audit.sql`
