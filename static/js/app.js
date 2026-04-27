let chart;

// ─── Validaciones ────────────────────────────────────────────────
const REGLAS = {
  peso_inicial: {
    min: 50, max: 599,
    label: 'Peso inicial',
    msg: v => {
      if (!v && v !== 0) return 'Campo obligatorio.';
      if (v < 50)  return 'Mínimo 50 kg.';
      if (v > 599) return 'Máximo 599 kg (menor al peso máximo del modelo).';
      return '';
    }
  },
  peso_objetivo: {
    min: 51, max: 600,
    label: 'Peso objetivo',
    msg: (v, ctx) => {
      if (!v && v !== 0) return 'Campo obligatorio.';
      if (v > 600) return 'Máximo 600 kg.';
      if (ctx && v <= ctx.peso_inicial) return 'Debe ser mayor al peso inicial.';
      if (v <= 0)  return 'Debe ser mayor a 0.';
      return '';
    }
  },
  costo_dia: {
    min: 1, max: 10000,
    label: 'Costo diario',
    msg: v => {
      if (!v && v !== 0) return 'Campo obligatorio.';
      if (v <= 0)   return 'Debe ser mayor a $0.';
      if (v > 10000) return 'Máximo $10,000 por día.';
      return '';
    }
  },
  precio_kg: {
    min: 1, max: 10000,
    label: 'Precio por kg',
    msg: v => {
      if (!v && v !== 0) return 'Campo obligatorio.';
      if (v <= 0)    return 'Debe ser mayor a $0.';
      if (v > 10000) return 'Máximo $10,000 por kg.';
      return '';
    }
  }
};

function getVal(id) {
  const v = document.getElementById(id).value;
  return v === '' ? null : parseFloat(v);
}

function setError(id, msg) {
  const el = document.getElementById('err_' + id);
  const input = document.getElementById(id);
  if (el) el.textContent = msg;
  if (input) input.classList.toggle('error', !!msg);
}

function validarCampos() {
  const vals = {
    peso_inicial: getVal('peso_inicial'),
    peso_objetivo: getVal('peso_objetivo'),
    costo_dia: getVal('costo_dia'),
    precio_kg: getVal('precio_kg'),
  };
  let valido = true;

  for (const [campo, regla] of Object.entries(REGLAS)) {
    const msg = regla.msg(vals[campo], vals);
    setError(campo, msg);
    if (msg) valido = false;
  }
  return valido ? vals : null;
}

// Validación en tiempo real
['peso_inicial', 'peso_objetivo', 'costo_dia', 'precio_kg'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('blur', () => validarCampos());
  el.addEventListener('input', () => {
    if (document.getElementById('err_' + id).textContent) validarCampos();
  });
});

// ─── Formateo ────────────────────────────────────────────────────
function fmt(n, decimales = 0) {
  return n.toLocaleString('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  });
}
function fmtMoney(n) {
  return '$' + fmt(n, 2);
}

// ─── Panel de resultados ─────────────────────────────────────────
function mostrarResultados(json, precioKg, costoDia) {
  const { venta, estado, recomendacion } = json;
  const pesoVenta  = venta.peso;
  const diaVenta   = venta.dia;
  const ingreso    = pesoVenta * precioKg;
  const costoTotal = diaVenta  * costoDia;
  const ganancia   = ingreso - costoTotal;

  // ─── DATOS MEJOR DÍA ─────────────────────────
  const mejorDia = json.resultado.mejor_dia;
  const mejorPeso = json.resultado.peso[mejorDia];
  const mejorGanancia = json.resultado.mejor_utilidad;

  // ✅ FIX IMPORTANTE
  const costoMejor = (mejorDia) * costoDia;

  // Badge de estado
  const badge = document.getElementById('status-badge');
  badge.textContent = estado;
  badge.className = 'status-badge';
  if (estado.includes('rápida'))   badge.classList.add('rapida');
  else if (estado.includes('No'))  badge.classList.add('warning');
  else                             badge.classList.add('normal');

  // Métricas
  document.getElementById('res-dia').textContent    = fmt(diaVenta);
  document.getElementById('res-peso').textContent   = fmt(pesoVenta, 1) + ' kg';
  document.getElementById('res-ingreso').textContent = fmtMoney(ingreso);
  document.getElementById('res-ingreso-sub').textContent = `${fmt(pesoVenta, 1)} kg × ${fmtMoney(precioKg)}`;

  const gEl = document.getElementById('res-ganancia');
  gEl.textContent = fmtMoney(ganancia);
  gEl.className = 'metric-value ' + (ganancia >= 0 ? 'positive' : 'negative');
  document.getElementById('res-costo-sub').textContent = `Costo total: ${fmtMoney(costoTotal)}`;

  // OBJETIVO
  document.getElementById('obj-dia').textContent = fmt(diaVenta);
  document.getElementById('obj-peso').textContent = fmt(pesoVenta, 1) + ' kg';
  document.getElementById('obj-ganancia').textContent = fmtMoney(ganancia);
  document.getElementById('obj-costo').textContent = fmtMoney(costoTotal);

  // MEJOR DÍA
  document.getElementById('mejor-dia').textContent = fmt(mejorDia);
  document.getElementById('mejor-peso').textContent = fmt(mejorPeso, 1) + ' kg';
  document.getElementById('mejor-ganancia').textContent = fmtMoney(mejorGanancia);
  document.getElementById('mejor-costo').textContent = fmtMoney(costoMejor);

  // DIFERENCIA
  const diff = mejorGanancia - ganancia;
  document.getElementById('diff-ganancia').textContent =
    diff >= 0
      ? `+${fmtMoney(diff)} más`
      : `${fmtMoney(diff)} menos`;

  // Recomendación
  document.getElementById('res-recomendacion').textContent = recomendacion;

  // Mostrar panel
  const panel = document.getElementById('results-panel');
  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Simulación ────────────────────────────────────────────────
async function simular() {
  const vals = validarCampos();
  if (!vals) return;

  const { peso_inicial, peso_objetivo, costo_dia, precio_kg } = vals;

  const tipo = document.getElementById('tipo').value;
  const genetica = parseFloat(document.getElementById('genetica').value);
  const alimentacion = parseFloat(document.getElementById('alimentacion').value);
  const manejo = parseFloat(document.getElementById('manejo').value);

  const btn = document.getElementById('btn-simular');
  btn.disabled = true;
  btn.textContent = 'Simulando...';

  let json;
  try {
    const res = await fetch('/simular', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        peso_inicial,
        peso_objetivo,
        tipo,
        genetica,
        alimentacion,
        manejo,
        costo_dia,
        precio_kg,
      })
    });
    json = await res.json();
  } catch (e) {
    alert('Error conectando con el servidor');
    btn.disabled = false;
    btn.textContent = 'Simular';
    return;
  }

  btn.disabled = false;
  btn.textContent = 'Simular';

  if (json.error) {
    alert(json.error);
    return;
  }

  mostrarResultados(json, precio_kg, costo_dia);

  // ─── Gráfica ─────────────────────────
  const pesos = json.resultado.peso;
  const tiempo = json.resultado.tiempo;
  const diaVenta = json.venta.dia;
  const mejorDia = json.resultado.mejor_dia;

  const mejorPlot = pesos.map((v, i) => i === mejorDia ? v : null);
  const ventaPlot = pesos.map((v, i) => i === diaVenta ? v : null);

  if (chart) chart.destroy();

chart = new Chart(document.getElementById('grafica'), {
  type: 'line',

  data: {
    labels: tiempo,
    datasets: [
      {
        label: 'Peso',
        data: pesos,
        borderColor: '#2E7D32',
        backgroundColor: 'rgba(46,125,50,0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 0
      },
      {
        label: 'Objetivo',
        data: tiempo.map(() => peso_objetivo),
        borderColor: '#C0501A',
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      },
      {
        label: 'Venta',
        data: ventaPlot,
        borderColor: '#1565C0',
        backgroundColor: '#1565C0',
        pointRadius: 6,
        showLine: false
      },
      {
        label: 'Mejor venta',
        data: mejorPlot,
        pointRadius: 6,
        backgroundColor: '#FFD700',
        showLine: false
      }
    ]
  },

  // 🔥 AQUÍ VA EXACTAMENTE
  options: {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      mode: 'index',
      intersect: false
    },

    plugins: {
      legend: {
        labels: {
          color: '#e8f5e0',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: '#1a2e1a',
        titleColor: '#A8D890',
        bodyColor: '#e8f5e0',
        borderColor: '#2d4a2d',
        borderWidth: 1
      }
    },

    scales: {
      x: {
        title: {
          display: true,
          text: 'Días',
          color: '#6a8a6a',
          font: { weight: 'bold' }
        },
        ticks: {
          color: '#6a8a6a'
        },
        grid: {
          color: 'rgba(100,120,100,0.2)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Peso (kg)',
          color: '#6a8a6a',
          font: { weight: 'bold' }
        },
        ticks: {
          color: '#6a8a6a'
        },
        grid: {
          color: 'rgba(100,120,100,0.2)'
        },
        beginAtZero: false
      }
    }
  }
});
}