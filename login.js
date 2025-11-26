document.getElementById("btnLogin").addEventListener("click", async () => {

    const usuario = document.getElementById("usuario").value;
    const password = document.getElementById("password").value;

    if (!usuario || !password) {
        alert("Ingresa usuario y contraseña");
        return;
    }

    // Crear hash de la contraseña ingresada
    const passwordHash = await hashPassword(password);

    // Enviar usuario al servidor para validar
    const respuesta = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, passwordHash })
    });

    const resultado = await respuesta.json();

    if (resultado.ok) {
        // Guardar sesión simple en el navegador
        localStorage.setItem("usuarioLogueado", JSON.stringify({
            usuario: resultado.usuario || usuario,
            nombre: resultado.nombre,
            correo: resultado.correo
        }));

        alert("Inicio de sesión correcto");
        window.location.href = "index.html";
    } else {
        if (resultado.mensaje === "Usuario no existe") {
            alert("El usuario no existe. Verifica el nombre de usuario.");
        } else if (resultado.mensaje === "Contraseña incorrecta") {
            alert("La contraseña no coincide con el usuario.");
        } else {
            // Cualquier otro mensaje que mande el servidor
            alert(resultado.mensaje);
        }
    }

});

async function hashPassword(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
