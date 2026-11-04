"use strict";

const { VALIDACIONES, TABLAS, ejecutarValidaciones } = require("../src/validaciones");

function validacion(nombre) {
  return VALIDACIONES.find((v) => v.nombre === nombre);
}

describe("criterios de cada validación", () => {
  test("tablas: exige exactamente las 5 del modelo", () => {
    const v = validacion("existen las 5 tablas del modelo");
    expect(v.esperado(TABLAS.map((t) => ({ t })))).toBe(true);
    expect(v.esperado(TABLAS.slice(1).map((t) => ({ t })))).toBe(false);
  });

  test.each([
    ["todas las tablas usan InnoDB y utf8mb4", 0],
    ["ninguna contraseña está en texto plano (todas son hash BCrypt)", 0],
    ["los datos de prueba no contienen correos reales", 0],
    ["no hay tareas sin proyecto ni comentarios sin tarea", 0],
    ["las tareas solo usan las listas que conoce la vista", 0],
    ["las 4 llaves foráneas existen", 4],
    ["el correo de usuario es único", 1],
  ])("%s: pasa solo con n = %i", (nombre, esperado) => {
    const v = validacion(nombre);
    expect(v.esperado([{ n: esperado }])).toBe(true);
    expect(v.esperado([{ n: BigInt(esperado) }])).toBe(true); // el driver devuelve COUNT(*) como BigInt
    expect(v.esperado([{ n: esperado + 1 }])).toBe(false);
  });
});

describe("ejecutarValidaciones", () => {
  test("devuelve los nombres de las validaciones que no se cumplen", async () => {
    const conexion = {
      query: jest.fn(async (consulta) => [{ n: consulta === "q2" ? 3 : 0 }]),
    };
    const validaciones = [
      { nombre: "uno", sql: "q1", esperado: (f) => f[0].n === 0 },
      { nombre: "dos", sql: "q2", esperado: (f) => f[0].n === 0 },
    ];

    expect(await ejecutarValidaciones(conexion, validaciones)).toEqual(["dos"]);
    expect(conexion.query).toHaveBeenCalledTimes(2);
  });

  test("por defecto ejecuta todas las validaciones del proyecto", async () => {
    const conexion = { query: jest.fn(async () => [{ n: 0 }]) };

    const fallidas = await ejecutarValidaciones(conexion);

    expect(conexion.query).toHaveBeenCalledTimes(VALIDACIONES.length);
    expect(fallidas).toEqual(expect.arrayContaining(["existen las 5 tablas del modelo", "las 4 llaves foráneas existen"]));
  });
});
