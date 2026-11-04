-- =====================================================================
-- Esquema de la base de datos dbgestor (Gestor de Proyectos)
-- Motor: MariaDB 10.6+ / 11.x
-- Origen: dump-dbgestor-202406261453.sql (MySQL dump de MariaDB 11.3.2)
--
-- Cambios respecto al dump original:
--   * utf8mb4 en lugar de latin1 (la aplicación trabaja en UTF-8 y los acentos se corrompían).
--   * Las claves *_FK eran solo índices; ahora son FOREIGN KEY reales con ON DELETE CASCADE.
--   * Correo de usuario UNIQUE y NOT NULL: el inicio de sesión busca por correo.
--   * contrasena guarda un hash BCrypt (60 caracteres), nunca texto plano.
--   * Se omite hibernate_sequence: las entidades usan GenerationType.IDENTITY.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS asignaciones;
DROP TABLE IF EXISTS comentarios;
DROP TABLE IF EXISTS tareas;
DROP TABLE IF EXISTS proyectos;
DROP TABLE IF EXISTS usuario;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE usuario (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  correo_electronico VARCHAR(100) NOT NULL,
  contrasena VARCHAR(100) NOT NULL,
  rol VARCHAR(100) DEFAULT NULL,
  imagen_usuario VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id_usuario),
  CONSTRAINT usuario_correo_UK UNIQUE (correo_electronico)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE proyectos (
  id_proyecto INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  fecha_inicio DATE DEFAULT NULL,
  fecha_finalizacion DATE DEFAULT NULL,
  estado_proyecto VARCHAR(100) DEFAULT NULL,
  fondo VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (id_proyecto),
  CONSTRAINT proyectos_fechas_CK CHECK (fecha_finalizacion IS NULL OR fecha_inicio IS NULL OR fecha_finalizacion >= fecha_inicio)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE tareas (
  id_tarea INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(255) DEFAULT NULL,
  fecha_vencimiento DATE DEFAULT NULL,
  estado VARCHAR(255) DEFAULT NULL,
  lista VARCHAR(255) DEFAULT NULL,
  id_proyecto INT DEFAULT NULL,
  PRIMARY KEY (id_tarea),
  KEY tareas_proyectos_IDX (id_proyecto),
  CONSTRAINT tareas_proyectos_FK FOREIGN KEY (id_proyecto) REFERENCES proyectos (id_proyecto) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE comentarios (
  id_comentario INT NOT NULL AUTO_INCREMENT,
  texto_comentario VARCHAR(250) DEFAULT NULL,
  fecha_hora DATETIME DEFAULT NULL,
  -- La aplicación guarda aquí el nombre del autor (no un id numérico), por eso no lleva FK a usuario
  id_usuario VARCHAR(100) DEFAULT NULL,
  id_tarea INT DEFAULT NULL,
  PRIMARY KEY (id_comentario),
  KEY comentarios_tareas_IDX (id_tarea),
  CONSTRAINT comentarios_tareas_FK FOREIGN KEY (id_tarea) REFERENCES tareas (id_tarea) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE asignaciones (
  id_asignacion INT NOT NULL AUTO_INCREMENT,
  id_usuario INT DEFAULT NULL,
  id_tarea INT DEFAULT NULL,
  fecha_asignacion DATE DEFAULT NULL,
  PRIMARY KEY (id_asignacion),
  KEY asignaciones_usuario_IDX (id_usuario),
  KEY asignaciones_tareas_IDX (id_tarea),
  CONSTRAINT asignaciones_usuario_FK FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT asignaciones_tareas_FK FOREIGN KEY (id_tarea) REFERENCES tareas (id_tarea) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
