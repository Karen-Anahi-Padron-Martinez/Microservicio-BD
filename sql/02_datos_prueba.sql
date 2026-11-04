-- =====================================================================
-- Datos de prueba de dbgestor
-- Los nombres y correos del dump original eran de personas reales y las contraseñas estaban
-- en texto plano. Se sustituyeron por datos ficticios (@example.com) y hashes BCrypt.
-- Contraseña de las tres cuentas demo: ver README.md (solo para entornos de prueba).
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO usuario (id_usuario, nombre, correo_electronico, contrasena, rol, imagen_usuario) VALUES
  (131, 'Usuario Demo Uno', 'demo1@example.com', '$2a$10$ZmWSoT8jH50GDu/1xFqo3eVV/nFrpvtlzUY2pdCnYbhaSrD0EuRMu', 'Estudiante', '#70FAB7'),
  (172, 'Usuario Demo Dos', 'demo2@example.com', '$2a$10$S3DxlJbRIbmP6CbZxK5lM.lB6Rgd2.AC4XvWmEdjf8TIZtfdqLoDK', 'Estudiante', '#54EA01'),
  (196, 'Usuario Demo Tres', 'demo3@example.com', '$2a$10$l3dA/JrM4JOpsMq0DfUBLe4DpEw4/UqU5dL/mIDG.r.qs4JHmLF8K', 'Estudiante', '#805611');

INSERT INTO proyectos (id_proyecto, nombre, descripcion, fecha_inicio, fecha_finalizacion, estado_proyecto, fondo) VALUES
  (197, 'My API Rest', 'Desarrollarán un API Rest que satisfaga un sistema de información con al menos 5 tablas.', '2024-05-31', '2024-06-29', 'En proceso', '/Images/animacion1.gif');

INSERT INTO tareas (id_tarea, nombre, descripcion, fecha_vencimiento, estado, lista, id_proyecto) VALUES
  (199, 'Base de datos', 'Realizar la estructura de las tablas', '2024-06-13', 'danger', 'terminado', 197);

INSERT INTO comentarios (id_comentario, texto_comentario, fecha_hora, id_usuario, id_tarea) VALUES
  (201, 'Subirlo YA!!!', '2024-06-26 13:48:00', 'Usuario Demo Tres', 199),
  (202, 'hola', '2024-06-26 13:49:00', 'Usuario Demo Dos', 199);
