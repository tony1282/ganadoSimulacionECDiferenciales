import numpy as np
from scipy.integrate import odeint

def engorda_ganado(
    peso_inicial,
    peso_objetivo,
    tipo,
    peso_max=599,
    genetica=1.0,
    alimentacion=1.0,
    manejo=1.0,
    tiempo=500,
    costo_dia=50,
    precio_kg=60
):
    if tipo == "intensiva":
        r_base = 0.009
    elif tipo == "normal":
        r_base = 0.0065
    else:
        r_base = 0.0045

    factor_combinado = (genetica + alimentacion + manejo) / 3
    r = r_base * factor_combinado

    def modelo(W, t):
        return r * W * (1 - W / peso_max)

    t = np.arange(0, tiempo + 1, 1)
    W = odeint(modelo, peso_inicial, t).flatten()

    ganancias = []
    mejor_dia = 1
    mejor_utilidad = -999999

    for i in range(len(W)):
        peso = W[i]
        ingreso = peso * precio_kg
        costo = i * costo_dia
        utilidad = ingreso - costo
        ganancias.append(utilidad)

        # 🔥 CORREGIDO: Ignora día 0 y primeros 30 días, y solo considera si ha ganado peso
        if i >= 30 and peso >= peso_inicial + 20 and utilidad > mejor_utilidad:
            mejor_utilidad = utilidad
            mejor_dia = i

    dia_venta = next((i for i, w in enumerate(W) if w >= peso_objetivo), len(W) - 1)

    return {
        "tiempo": t.tolist(),
        "peso": W.tolist(),
        "ganancia": ganancias,
        "dia_venta": int(dia_venta),
        "peso_venta": float(W[dia_venta]),
        "mejor_dia": int(mejor_dia),
        "mejor_utilidad": float(mejor_utilidad)
    }