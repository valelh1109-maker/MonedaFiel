// app.js


(function () {

  const margenPorc = 60; // 60% margen (puedes cambiar)
  const respaldoPorc = 0.10; // 10% respaldo

  const inputNombreProducto = document.getElementById("nombreProducto");

  const contenedor = document.getElementById("contenedorIngredientes");
  const btnGenerar = document.getElementById("btnGenerar");
  const btnCalcular = document.getElementById("btnCalcular");

  // Salidas
  const elSubtotalIngr = document.getElementById("subtotalIngr");
  const elCostosAdUnit = document.getElementById("costosAdUnit");
  const elCostoSubfinal = document.getElementById("costoSubfinal");
  const elRespaldo = document.getElementById("respaldo");
  const elTotalUnidad = document.getElementById("totalUnidad");
  const elPrecioSugerido = document.getElementById("precioSugerido");
  const elExplicacion = document.getElementById("explicacionCalc");
  const elAdvertencias = document.getElementById("contenedorAdvertencias");



  // === Funciones principales ===

  // leer usuario logueado desde localStorage
  let usuarioSesion = null;
  try {
    const uStr = localStorage.getItem("usuarioLogueado");
    if (uStr) {
      usuarioSesion = JSON.parse(uStr); // { usuario, nombre, correo }
    }
  } catch (e) {
    console.error("Error leyendo usuarioLogueado:", e);
  }

  //  para guardar el último cálculo
  let ultimoCalculo = null;

  function generarIngredientesDefault(n) {
    document.getElementById("cantidadIngredientes").value = n;
    generarIngredientes();
  }

  function generarIngredientes() {
    const cantidad = parseInt(document.getElementById("cantidadIngredientes").value) || 0;
    contenedor.innerHTML = "";
    for (let i = 1; i <= cantidad; i++) {
      const div = document.createElement("div");
      div.className = "tarjeta ingrediente-card";
      div.dataset.index = i;

      div.innerHTML = `
        <h4>Ingrediente ${i}</h4>

        <label>Nombre</label>
        <input type="text" class="i_nombre" placeholder="Ej: Salsa">

        <label>Cantidad comprada (en la misma unidad)</label>
        <input type="number" class="i_cantComprada" min="0" step="0.0001" value="0">

        <label>Precio de compra (total)</label>
        <input type="number" class="i_precioCompra" min="0" step="0.01" value="0">

        <label>Cantidad usada por unidad</label>
        <input type="number" class="i_cantUsada" min="0" step="0.0001" value="0">

        <div class="output-line"><div>Precio unitario:</div><div class="valor i_precioUnitario">—</div></div>
        <div class="output-line"><div>Costo por unidad (ingrediente):</div><div class="valor i_costoPorUnidad">—</div></div>
      `;
      contenedor.appendChild(div);
    }
    agregarListenersInputs();
  }

  function agregarListenersInputs() {
    const inputs = document.querySelectorAll(".ingrediente-card input, #c_mano, #c_trans, #c_serv, #c_otros, #produccionMensual");
    inputs.forEach(inp => {
      inp.addEventListener("input", () => {
        calcularTodo();
      });
    });
  }

  function leerIngredientes() {
    const tarjetas = Array.from(contenedor.querySelectorAll(".ingrediente-card"));
    const ingredientes = [];
    tarjetas.forEach(t => {
      const nombre = t.querySelector(".i_nombre").value.trim() || ("Ingrediente");
      const cantComprada = Number(t.querySelector(".i_cantComprada").value) || 0;
      const precioCompra = Number(t.querySelector(".i_precioCompra").value) || 0;
      const cantUsada = Number(t.querySelector(".i_cantUsada").value) || 0;

      const precioUnitario = cantComprada > 0 ? (precioCompra / cantComprada) : 0;
      const costoPorUnidad = precioUnitario * cantUsada;

      const elPU = t.querySelector(".i_precioUnitario");
      const elCPU = t.querySelector(".i_costoPorUnidad");
      elPU.textContent = precioUnitario ? formatNumero(precioUnitario) : "—";
      elCPU.textContent = costoPorUnidad ? formatNumero(costoPorUnidad) : "—";

      ingredientes.push({
        nombre, cantComprada, precioCompra, cantUsada,
        precioUnitario, costoPorUnidad
      });
    });
    return ingredientes;
  }

  function calcularTodo() {
    const ingredientes = leerIngredientes();

    const subtotalIngr = ingredientes.reduce((s, it) => s + (Number(it.costoPorUnidad) || 0), 0);

    const mano = Number(document.getElementById("c_mano").value) || 0;
    const trans = Number(document.getElementById("c_trans").value) || 0;
    const serv = Number(document.getElementById("c_serv").value) || 0;
    const otros = Number(document.getElementById("c_otros").value) || 0;
    const produccion = Number(document.getElementById("produccionMensual").value) || 1;

    const totalMensual = mano + trans + serv + otros;
    const costosAdUnit = produccion > 0 ? (totalMensual / produccion) : totalMensual;

    const costoSubfinal = subtotalIngr + costosAdUnit;
    const respaldo = costoSubfinal * respaldoPorc;
    const costoTotalPorU = costoSubfinal + respaldo;
    const precioSugerido = costoTotalPorU * (1 + margenPorc / 100);

    // guarda todo en ultimoCalculo para el CSV/servidor
    ultimoCalculo = {
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
    };

    elSubtotalIngr.textContent = subtotalIngr ? formatNumero(subtotalIngr) : "—";
    elCostosAdUnit.textContent = costosAdUnit ? formatNumero(costosAdUnit) : "—";
    elCostoSubfinal.textContent = costoSubfinal ? formatNumero(costoSubfinal) : "—";
    elRespaldo.textContent = respaldo ? formatNumero(respaldo) : "—";
    elTotalUnidad.textContent = costoTotalPorU ? formatNumero(costoTotalPorU) : "—";
    elPrecioSugerido.textContent = precioSugerido ? formatNumero(precioSugerido) : "—";

    const explicacion = [
      `Precio unitario por ingrediente = precio de compra ÷ cantidad comprada.`,
      `Costo por unidad (ingrediente) = precio unitario × cantidad usada por unidad.`,
      `Subtotal ingredientes = suma de costos por ingrediente = ${formatNumero(subtotalIngr)}.`,
      `Costos adicionales por unidad = total mensual (${formatNumero(totalMensual)}) ÷ producción mensual (${produccion}) = ${formatNumero(costosAdUnit)}.`,
      `Costo subfinal = subtotal ingredientes + costos adicionales = ${formatNumero(costoSubfinal)}.`,
      `Respaldo (10%) = ${formatNumero(respaldo)}.`,
      `Costo total por unidad = costo subfinal + respaldo = ${formatNumero(costoTotalPorU)}.`,
      `Precio sugerido (margen ${margenPorc}%) = costo total × (1 + ${margenPorc / 100}) = ${formatNumero(precioSugerido)}.`
    ];
    elExplicacion.innerHTML = explicacion.map(s => `<li>${s}</li>`).join("");

    // advertencias
    const warns = [];
    ingredientes.forEach((it, idx) => {
      if (it.cantComprada === 0 && (it.precioCompra > 0 || it.cantUsada > 0)) {
        warns.push(`Ingrediente ${idx + 1}: cantidad comprada es 0 (revisa unidades).`);
      }
      if (it.precioCompra === 0 && (it.cantComprada > 0 || it.cantUsada > 0)) {
        warns.push(`Ingrediente ${idx + 1}: precio de compra es 0.`);
      }
      if (it.cantUsada > it.cantComprada && it.cantComprada > 0) {
        warns.push(`Ingrediente ${idx + 1}: cantidad usada (${it.cantUsada}) mayor a cantidad comprada (${it.cantComprada}).`);
      }
    });

    ingredientes.forEach((it, idx) => {
      if (subtotalIngr > 0 && (it.costoPorUnidad / subtotalIngr) > 0.5) {
        warns.push(`Ingrediente ${idx + 1}: representa más del 50% del costo de ingredientes.`);
      }
    });

    if (subtotalIngr > 0 && costosAdUnit > subtotalIngr) {
      warns.push("Los costos adicionales por unidad son mayores que el costo de ingredientes: ajusta gastos o aumenta producción.");
    }

    if (costoTotalPorU > 0) {
      const margenReal = (precioSugerido - costoTotalPorU) / costoTotalPorU;
      if (margenReal < 0.10) {
        warns.push("La ganancia real es menor al 10%: margen insuficiente para sostenibilidad.");
      }
    }

    if (costoTotalPorU <= 0) {
      warns.push("El costo total es 0 o negativo: verifica precios y cantidades.");
    }
    if (costosAdUnit < 0.01 && totalMensual > 0) {
      warns.push("Costos mensuales prorrateados resultan casi nulos: revisa producción mensual o valores ingresados.");
    }

    const uniq = Array.from(new Set(warns));
    if (uniq.length) {
      elAdvertencias.innerHTML = "<ul>" + uniq.map(w => `<li>${w}</li>`).join("") + "</ul>";
      elAdvertencias.style.color = "#8a2b2b";
    } else {
      elAdvertencias.innerHTML = "<p>Sin advertencias.</p>";
      elAdvertencias.style.color = "#2f4f43";
    }
  }

  function formatNumero(n) {
    return n === 0 ? "0" : n ? ("$" + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 })) : "";
  }

  // === Exportar a CSV ===
  function crearBotonExport() {
    if (document.getElementById('exportCSV')) return;
    const btn = document.createElement('button');
    btn.id = 'exportCSV';
    btn.className = 'btn-csv';
    btn.textContent = 'Exportar a CSV';
    // colocar al final de la sección de resultados
    const resultados = document.querySelector('.tarjeta.resultados');
    if (resultados) resultados.appendChild(btn);

    btn.addEventListener('click', exportarCSV);
  }

  // === Guardar producto en el servidor (CSV por usuario) ===
  async function guardarProductoEnServidor(nombreProducto) {
    if (!usuarioSesion || !usuarioSesion.usuario) {
      // No hay sesión → no guardar en servidor
      return;
    }
    if (!ultimoCalculo) {
      // Si por alguna razón no se ha calculado, calcula
      calcularTodo();
    }

    const payload = {
      usuario: usuarioSesion.usuario,
      nombreProducto,
      datos: ultimoCalculo
    };

    try {
      const resp = await fetch("/guardar-producto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (!data.ok) {
        console.error("No se pudo guardar el producto en el servidor:", data.mensaje);
        return;
      }

      // Después de guardar, descargar el CSV general del usuario
      const a = document.createElement("a");
      a.href = `/productos-usuario?usuario=${encodeURIComponent(usuarioSesion.usuario)}`;
      a.setAttribute("download", `productos_${usuarioSesion.usuario}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (e) {
      console.error("Error al guardar producto en servidor:", e);
    }
  }

  async function exportarCSV() {

    // Asegura tener cálculo actualizado
    if (!ultimoCalculo) {
      calcularTodo();
    }

    // ==== Nombre del producto ====
    const inputNombreProducto = document.getElementById("nombreProducto");
    const nombreProducto = (inputNombreProducto?.value || "").trim() || "Producto sin nombre";

    const rows = [];

    // Título del producto
    rows.push(["Nombre del producto", nombreProducto]);
    rows.push([]);

    // ==== INGREDIENTES ====
    rows.push(['INGREDIENTES']);
    rows.push(['#', 'Nombre', 'Cantidad comprada', 'Precio compra total', 'Cantidad usada por unidad', 'Precio unitario', 'Costo por unidad']);

    document.querySelectorAll('.ingrediente-card').forEach((card, index) => {
      const nombre = card.querySelector('.i_nombre')?.value || '';
      const cantComprada = card.querySelector('.i_cantComprada')?.value || '';
      const precioCompra = card.querySelector('.i_precioCompra')?.value || '';
      const cantUsada = card.querySelector('.i_cantUsada')?.value || '';
      const precioUnidad = card.querySelector('.i_precioUnitario')?.textContent || '';
      const costoUnit = card.querySelector('.i_costoPorUnidad')?.textContent || '';

      rows.push([index + 1, nombre, cantComprada, precioCompra, cantUsada, precioUnidad, costoUnit]);
    });

    // ==== COSTOS ADICIONALES ====
    rows.push([]);
    rows.push(['COSTOS ADICIONALES']);
    rows.push(['Mano de obra', document.getElementById('c_mano')?.value || '0']);
    rows.push(['Transporte', document.getElementById('c_trans')?.value || '0']);
    rows.push(['Servicios', document.getElementById('c_serv')?.value || '0']);
    rows.push(['Otros', document.getElementById('c_otros')?.value || '0']);
    rows.push(['Producción mensual', document.getElementById('produccionMensual')?.value || '']);

    // ==== RESULTADOS ====
    rows.push([]);
    rows.push(['RESULTADOS']);
    rows.push(['Subtotal ingredientes', elSubtotalIngr.textContent || '']);
    rows.push(['Costos ad. por unidad', elCostosAdUnit.textContent || '']);
    rows.push(['Costo subfinal', elCostoSubfinal.textContent || '']);
    rows.push(['Respaldo (10%)', elRespaldo.textContent || '']);
    rows.push(['Costo total por unidad', elTotalUnidad.textContent || '']);
    rows.push(['Precio sugerido', elPrecioSugerido.textContent || '']);

    // ==== EXPLICACIÓN ====
    const explic = Array.from(elExplicacion.querySelectorAll('li'))
      .map(li => li.textContent)
      .join(' | ');

    rows.push(['Explicación', explic]);

    // ==== CSV INDIVIDUAL  ====
    const csvContent = rows
      .map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
      .join('');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'calculo_producto.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);


    // ====== 2) GUARDAR EN CSV DEL USUARIO (SI ESTÁ LOGUEADO) ======

    let usuarioSesion = null;
    try {
      const uStr = localStorage.getItem("usuarioLogueado");
      if (uStr) usuarioSesion = JSON.parse(uStr);
    } catch (e) { }

    if (usuarioSesion && usuarioSesion.usuario) {

      try {
        await fetch("/guardar-producto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usuario: usuarioSesion.usuario,
            nombreProducto,
            datos: ultimoCalculo
          })
        });

        // Descarga de la tabla general del usuario
        const a2 = document.createElement("a");
        a2.href = `/productos-usuario?usuario=${encodeURIComponent(usuarioSesion.usuario)}`;
        a2.setAttribute("download", `productos_${usuarioSesion.usuario}.csv`);
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);

      } catch (err) {
        console.error("Error al guardar en el CSV del usuario:", err);
      }
    }
  }


  // eventos
  btnGenerar.addEventListener("click", (e) => {
    e.preventDefault();
    generarIngredientes();
    calcularTodo();
  });



  // iniciar
  generarIngredientesDefault(3);
  crearBotonExport();
  calcularTodo();

})();
