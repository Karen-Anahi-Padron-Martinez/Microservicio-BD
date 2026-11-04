# Microservicio BD: dbgestor (MariaDB)

Scripts de base de datos del Gestor de Proyectos. Lo consumen **Microservicio1** (API, Spring Boot + JPA) y **Microservicio2** (Cliente web).

## Contenido

| Ruta | Qué es |
|---|---|
| `sql/01_esquema.sql` | DDL: tablas `usuario`, `proyectos`, `tareas`, `comentarios`, `asignaciones` |
| `sql/02_datos_prueba.sql` | Datos de prueba ficticios (contraseñas con hash BCrypt) |
| `src/sql.js` | Divide y ejecuta los scripts; crea/borra la BD temporal `dbgestor_ci_*` |
| `src/lint.js`, `bin/lint-sql.js` | Lint SQL: sintaxis MariaDB y reglas del proyecto |
| `src/validaciones.js` | Validaciones de esquema y datos que se ejecutan contra la BD |
| `test/` | Pruebas Jest: unitarias (sin BD) e integración (BD temporal real) |
| `Jenkinsfile` | Pipeline: lint → pruebas sobre BD temporal → SonarQube → Quality Gate |

## Cambios respecto al dump original (`dump-dbgestor-202406261453.sql`)

- Juego de caracteres **utf8mb4** en lugar de latin1.
- Llaves foráneas reales (antes eran solo índices `*_FK`) con `ON DELETE CASCADE`.
- `usuario.correo_electronico` `UNIQUE NOT NULL` (el login busca por correo).
- `CHECK` para que `fecha_finalizacion` no sea anterior a `fecha_inicio`.
- Datos personales reales sustituidos por datos ficticios `@example.com`; contraseñas en texto plano sustituidas por hashes BCrypt.
- Se elimina `hibernate_sequence` (las entidades usan `GenerationType.IDENTITY`).

Cuentas demo (solo para pruebas): `demo1@example.com`, `demo2@example.com` y `demo3@example.com`, todas con la contraseña `Demo2026!`.

## Uso local

```bash
npm ci
npm run lint:sql                      # no requiere BD
npm test                              # unitarias; la integración se omite si no hay BD
DB_HOST=localhost DB_PORT=3307 DB_USER=ci_bd DB_PASSWORD=*** REQUIERE_BD=1 npm run test:ci
```

## Calidad

SonarQube **no calcula cobertura de código SQL**. Para este proyecto el criterio es Quality Gate aprobado, 0 bugs, 0 vulnerabilidades y 0 hotspots sin revisar. La cobertura que se reporta (`coverage/lcov.info`) corresponde a la capa JavaScript que carga y valida los scripts.
