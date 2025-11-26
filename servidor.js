const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Rutas de los CSV
const rutaUsuariosCSV = path.join(__dirname, "usuarios.csv");
const rutaPendientesCSV = path.join(__dirname, "pendientes.csv");
//carpeta para productos por usuario
const rutaProductosDir = path.join(__dirname, "productos_usuarios");

// Crear archivos si no existen
if (!fs.existsSync(rutaUsuariosCSV)) {
  fs.writeFileSync(rutaUsuariosCSV, "nombre,correo,usuario,contrasenaHash\n");
}

if (!fs.existsSync(rutaPendientesCSV)) {
  fs.writeFileSync(rutaPendientesCSV, "nombre,correo,usuario,contrasenaHash,token\n");
}

if (!fs.existsSync(rutaProductosDir)) {
  fs.mkdirSync(rutaProductosDir);
}

// =============================================================
//  FUNCIÓN PARA VALIDAR CORREO O USUARIO DUPLICADO
// =============================================================
function verificarDuplicados(rutaCSV, correo, usuario) {
  const contenido = fs.readFileSync(rutaCSV, "utf8");
  const lineas = contenido.split("\n").slice(1); // saltar encabezado

  let correoExiste = false;
  let usuarioExiste = false;

  for (const linea of lineas) {
    if (!linea.trim()) continue;

    const partes = linea.split(",").map(s => s.trim());
    const correoCSV = partes[1];
    const usuarioCSV = partes[2];

    if (correoCSV === correo) correoExiste = true;
    if (usuarioCSV === usuario) usuarioExiste = true;
  }

  return { correoExiste, usuarioExiste };
}

// === CONFIGURACIÓN NODEMAILER (GMAIL) ===
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "infomonedafiel@gmail.com",
    pass: "ezem flgv qefz swdh"   // <--- la de 16 caracteres
  },
  tls: {
    rejectUnauthorized: false
  }
});

// =============== REGISTRO (usuario pendiente) ===============
app.post("/registrar", (req, res) => {
  const { nombre, correo, usuario, contrasenaHash } = req.body;

  if (!nombre || !correo || !usuario || !contrasenaHash) {
    return res.json({ ok: false, mensaje: "Faltan datos." });
  }

  // Revisar duplicados en usuarios verificados
  const verificados = verificarDuplicados(rutaUsuariosCSV, correo, usuario);

  // Revisar duplicados en pendientes
  const pendientes = verificarDuplicados(rutaPendientesCSV, correo, usuario);

  // Unir resultados
  const correoExiste = verificados.correoExiste || pendientes.correoExiste;
  const usuarioExiste = verificados.usuarioExiste || pendientes.usuarioExiste;

  // Mensajes claros
  if (correoExiste && usuarioExiste) {
    return res.json({
      ok: false,
      mensaje: "El correo y el nombre de usuario ya están registrados."
    });
  }

  if (correoExiste) {
    return res.json({
      ok: false,
      mensaje: "Este correo ya está registrado."
    });
  }

  if (usuarioExiste) {
    return res.json({
      ok: false,
      mensaje: "El nombre de usuario ya está ocupado. Elige otro."
    });
  }

  // ===================== SI NO HAY DUPLICADOS → CONTINÚA ======================

  const token = crypto.randomBytes(32).toString("hex");
  const lineaPendiente = `${nombre},${correo},${usuario},${contrasenaHash},${token}\n`;

  fs.appendFile(rutaPendientesCSV, lineaPendiente, async (err) => {
    if (err) {
      return res.json({ ok: false, mensaje: "Error guardando usuario pendiente" });
    }

    const linkVerificacion = `http://localhost:3000/verificar?token=${token}`;

    try {
      await transporter.sendMail({
        from: `"Moneda Fiel" <infomonedafiel@gmail.com>`,
        to: correo,
        subject: "Verifica tu correo - Moneda Fiel",
        html: `
          <h1>Hola, ${nombre}</h1>
          <p>Gracias por registrarte en <b>Moneda Fiel</b>.</p>
          <p>Para activar tu cuenta, haz clic en el siguiente enlace:</p>
          <p><a href="${linkVerificacion}">Verificar mi cuenta</a></p>
          <p>Si tú no hiciste este registro, puedes ignorar este correo.</p>
        `
      });

      console.log("Correo de verificación enviado a", correo);
    } catch (e) {
      console.error("Error enviando correo:", e);
      // El usuario sigue como pendiente; no romper el registro
    }

    return res.json({
      ok: true,
      mensaje: "Te enviamos un correo de verificación. Revisa tu bandeja."
    });
  });
});

// =============== VERIFICAR LINK DEL CORREO ===============
app.get("/verificar", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.send("Token de verificación inválido.");
  }

  const contenido = fs.readFileSync(rutaPendientesCSV, "utf8");
  const lineas = contenido.split("\n");
  if (lineas.length === 0) {
    return res.send("No hay registros pendientes.");
  }

  const encabezado = lineas[0];          // primera línea (cabecera)
  const restantes = lineas.slice(1);

  let encontrado = false;
  const nuevasPendientes = [encabezado];

  for (const linea of restantes) {
    if (!linea.trim()) continue;

    const [nombre, correo, usuario, contrasenaHash, tokenCSV] =
      linea.split(",").map(s => s.trim());

    if (tokenCSV === token) {
      encontrado = true;

      // Mover a usuarios.csv (usuario ya verificado)
      const lineaUsuario = `${nombre},${correo},${usuario},${contrasenaHash}\n`;
      fs.appendFileSync(rutaUsuariosCSV, lineaUsuario);
    } else {
      nuevasPendientes.push(linea);
    }
  }

  // Reescribir pendientes sin el usuario verificado
  fs.writeFileSync(rutaPendientesCSV, nuevasPendientes.join("\n"));

  if (!encontrado) {
    return res.send(`
      <h1>Enlace inválido</h1>
      <p>El enlace de verificación es incorrecto o ya fue usado.</p>
    `);
  }

  // Página de éxito + redirección al login
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Cuenta verificada</title>
      <meta http-equiv="refresh" content="4;url=/inicio.html">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        a { color: #3366cc; }
      </style>
    </head>
    <body>
      <h1>¡Correo verificado!</h1>
      <p>Tu cuenta ha sido activada correctamente.</p>
      <p>En unos segundos te llevaremos al inicio de sesión.<br>
         Si no pasa nada, haz clic <a href="/inicio.html">aquí</a>.</p>
    </body>
    </html>
  `);
});


// =============== LOGIN (solo usuarios verificados) ===============
app.post("/login", (req, res) => {
  const { usuario, passwordHash } = req.body;

  const contenido = fs.readFileSync(rutaUsuariosCSV, "utf8");
  const lineas = contenido.split("\n").slice(1); // saltar encabezado

  for (let linea of lineas) {
    if (!linea.trim()) continue;

    const [nombre, correo, usuarioCSV, hashCSV] = linea.split(",").map(s => s.trim());

    if (usuarioCSV === usuario) {
      if (hashCSV === passwordHash) {
        return res.json({
          ok: true,
          mensaje: "Inicio de sesión correcto",
          nombre,
          correo,
          usuario: usuarioCSV
        });
      } else {
        return res.json({ ok: false, mensaje: "Contraseña incorrecta" });
      }
    }
  }

  return res.json({ ok: false, mensaje: "Usuario no existe" });
});

// =============== OBTENER DATOS DE UN USUARIO ===============
app.get("/usuario", (req, res) => {
  const { usuario } = req.query;

  if (!usuario) {
    return res.json({ ok: false, mensaje: "Falta el usuario en la consulta." });
  }

  const contenido = fs.readFileSync(rutaUsuariosCSV, "utf8");
  const lineas = contenido.split("\n").slice(1); // saltar encabezado

  for (let linea of lineas) {
    if (!linea.trim()) continue;

    const [nombre, correo, usuarioCSV, hashCSV] = linea.split(",").map(s => s.trim());

    if (usuarioCSV === usuario) {
      return res.json({
        ok: true,
        nombre,
        correo,
        usuario: usuarioCSV
      });
    }
  }

  return res.json({ ok: false, mensaje: "Usuario no encontrado." });
});

// =============== ACTUALIZAR DATOS DE UN USUARIO ===============
app.post("/actualizar-usuario", (req, res) => {
  const { usuarioOriginal, nombre, correo, usuarioNuevo } = req.body;

  if (!usuarioOriginal || !nombre || !correo || !usuarioNuevo) {
    return res.json({ ok: false, mensaje: "Faltan datos para actualizar." });
  }

  const contenido = fs.readFileSync(rutaUsuariosCSV, "utf8");
  const lineas = contenido.split("\n");
  if (!lineas.length) {
    return res.json({ ok: false, mensaje: "No hay usuarios registrados." });
  }

  const encabezado = lineas[0];
  const restantes = lineas.slice(1);

  let existeUsuarioOriginal = false;

  // 1) Revisar duplicados (correo / usuarioNuevo) en otros usuarios
  for (const linea of restantes) {
    if (!linea.trim()) continue;

    const partes = linea.split(",").map(s => s.trim());
    const correoCSV = partes[1];
    const usuarioCSV = partes[2];

    // Ignorar el propio usuarioOriginal
    if (usuarioCSV !== usuarioOriginal) {
      if (correoCSV === correo) {
        return res.json({ ok: false, mensaje: "Este correo ya está registrado." });
      }
      if (usuarioCSV === usuarioNuevo) {
        return res.json({ ok: false, mensaje: "Este nombre de usuario ya está ocupado." });
      }
    }
  }

  // 2) Reescribir archivo con los nuevos datos
  const nuevasLineas = [encabezado];

  for (const linea of restantes) {
    if (!linea.trim()) continue;

    const partes = linea.split(",").map(s => s.trim());
    const [nombreCSV, correoCSV, usuarioCSV, hashCSV] = partes;

    if (usuarioCSV === usuarioOriginal) {
      existeUsuarioOriginal = true;
      // NO tocar la contraseña (hashCSV)
      nuevasLineas.push(`${nombre},${correo},${usuarioNuevo},${hashCSV}`);
    } else {
      nuevasLineas.push(linea.trim());
    }
  }

  if (!existeUsuarioOriginal) {
    return res.json({ ok: false, mensaje: "El usuario a actualizar no existe." });
  }

  fs.writeFileSync(rutaUsuariosCSV, nuevasLineas.join("\n"));

  return res.json({ ok: true, mensaje: "Datos de usuario actualizados correctamente." });
});

// =============== GUARDAR PRODUCTO DE UN USUARIO ===============
app.post("/guardar-producto", (req, res) => {
  const { usuario, nombreProducto, datos } = req.body;

  if (!usuario || !nombreProducto || !datos) {
    return res.json({ ok: false, mensaje: "Faltan datos para guardar el producto." });
  }

  const archivoUsuario = path.join(rutaProductosDir, `productos_${usuario}.csv`);
  const encabezado = "fecha,nombreProducto,subtotalIngr,costosAdUnit,costoSubfinal,respaldo,costoTotalPorU,precioSugerido,mano,trans,serv,otros,produccion\n";

  // Crear archivo del usuario con encabezado si no existe o está vacío
  if (!fs.existsSync(archivoUsuario) || fs.readFileSync(archivoUsuario, "utf8").trim() === "") {
    fs.writeFileSync(archivoUsuario, encabezado);
  }

  const {
    subtotalIngr,
    costosAdUnit,
    costoSubfinal,
    respaldo,
    costoTotalPorU,
    precioSugerido,
    mano,
    trans,
    serv,
    otros,
    produccion
  } = datos;

  const fecha = new Date().toISOString();

  const linea = [
    fecha,
    nombreProducto,
    subtotalIngr,
    costosAdUnit,
    costoSubfinal,
    respaldo,
    costoTotalPorU,
    precioSugerido,
    mano,
    trans,
    serv,
    otros,
    produccion
  ].join(",") + "\n";

  fs.appendFile(archivoUsuario, linea, (err) => {
    if (err) {
      console.error("Error guardando producto:", err);
      return res.json({ ok: false, mensaje: "Error guardando producto en el servidor." });
    }

    return res.json({ ok: true, mensaje: "Producto guardado correctamente." });
  });
});

// =============== DESCARGAR CSV DE PRODUCTOS DE UN USUARIO ===============
app.get("/productos-usuario", (req, res) => {
  const { usuario } = req.query;

  if (!usuario) {
    return res.status(400).send("Falta el usuario.");
  }

  const archivoUsuario = path.join(rutaProductosDir, `productos_${usuario}.csv`);

  if (!fs.existsSync(archivoUsuario)) {
    return res.status(404).send("Aún no hay productos guardados para este usuario.");
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="productos_${usuario}.csv"`);

  const stream = fs.createReadStream(archivoUsuario);
  stream.pipe(res);
});



// =============== INICIAR SERVIDOR ===============
app.listen(3000, () => {
  console.log("Servidor ejecutándose en http://localhost:3000");
});

