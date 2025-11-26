document.getElementById("formRegistro").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const correo = document.getElementById("correo").value;
  const usuario = document.getElementById("usuario").value;
  const contrasena = document.getElementById("contrasena").value;

  if (!nombre || !correo || !usuario || !contrasena) {
    alert("Por favor completa todos los campos.");
    return;
  }

  // Hash de la contraseña (simple)
  const hash = await hashPassword(contrasena);

  const datos = {
    nombre,
    correo,
    usuario,
    contrasenaHash: hash
  };

  // Enviar al servidor
  const respuesta = await fetch("/registrar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datos)
  });

  const resultado = await respuesta.json();

  if (resultado.ok) {
    alert("Te enviamos un correo de verificación. Revisa tu bandeja y haz clic en el enlace para completar tu registro.");
    // NO redirigir todavía
  } else {
    alert("Error: " + resultado.mensaje);
  }
});

// Función hash
async function hashPassword(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

