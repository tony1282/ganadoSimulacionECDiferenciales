from flask import Flask, request, jsonify, render_template
from modelo import engorda_ganado

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/simular', methods=['POST'])
def simular():
    data = request.json

    try:
        peso_inicial   = float(data['peso_inicial'])
        peso_objetivo  = float(data['peso_objetivo'])
        tipo = data.get('tipo', 'normal')
        genetica     = float(data.get('genetica', 1.0))
        alimentacion = float(data.get('alimentacion', 1.0))
        manejo       = float(data.get('manejo', 1.0))
        costo_dia = float(data.get('costo_dia', 50))
        precio_kg = float(data.get('precio_kg', 60))

        if peso_inicial <= 40:
            return jsonify({"error": "El peso inicial debe ser mayor a 40."}), 400

        if peso_objetivo <= peso_inicial:
            return jsonify({"error": "El peso objetivo debe ser mayor al peso inicial."}), 400

        resultado = engorda_ganado(
            peso_inicial,
            peso_objetivo,
            tipo,
            genetica=genetica,
            alimentacion=alimentacion,
            manejo=manejo,
            costo_dia=costo_dia,
            precio_kg=precio_kg,
        )

        peso_final = resultado["peso"][-1]
        mejor_dia  = resultado["mejor_dia"]
        dia_venta  = resultado["dia_venta"]
        peso_mejor = round(resultado["peso"][mejor_dia], 1)
        peso_objetivo_real = round(resultado["peso"][dia_venta], 1)
        
        ganancia_objetivo = resultado["ganancia"][dia_venta]
        ganancia_mejor = resultado["ganancia"][mejor_dia]
        diferencia = ganancia_mejor - ganancia_objetivo

        # 👇 NUEVA LÓGICA DE RECOMENDACIÓN MÁS REALISTA
        if peso_final < peso_objetivo:
            estado = " No alcanza el peso objetivo"
            recomendacion = f"Máximo peso alcanzado: {round(peso_final, 1)} kg. Mejora alimentación, genética o manejo para llegar a {peso_objetivo} kg."
        
        elif mejor_dia > dia_venta:
            estado = " Conviene engordar más"
            recomendacion = (
                f"Alcanzas el objetivo en el día {dia_venta} con {peso_objetivo_real} kg (ganancia {ganancia_objetivo:,.0f} $). "
                f"PERO si esperas hasta el día {mejor_dia} con {peso_mejor} kg, "
                f"ganas {diferencia:,.0f} $ más."
            )
        
        elif mejor_dia < dia_venta:
            estado = " Venta anticipada óptima"
            recomendacion = (
                f"Vender en el día {mejor_dia} con {peso_mejor} kg te da {ganancia_mejor:,.0f} $. "
                f"Esperar hasta el objetivo (día {dia_venta}, {peso_objetivo_real} kg) "
                f"reduce la ganancia en {abs(diferencia):,.0f} $."
            )
        
        elif dia_venta < 100:
            estado = " Engorda súper rápida"
            recomendacion = "Excelente rendimiento. Podrías rotar el ganado más rápido y aumentar tu producción anual."
        
        else:
            estado = " Engorda normal"
            recomendacion = "Crecimiento adecuado para producción estándar. Puedes vender en el día objetivo sin problemas."

        return jsonify({
            "resultado": resultado,
            "estado": estado,
            "recomendacion": recomendacion,
            "venta": {
                "dia": resultado["dia_venta"],
                "peso": resultado["peso_venta"]
            },
            "mejor": {
                "dia": mejor_dia,
                "peso": peso_mejor,
                "ganancia": ganancia_mejor
            },
            "diferencia": diferencia
        })

    except KeyError as e:
        return jsonify({"error": f"Falta el campo: {e}"}), 400
    except ValueError as e:
        return jsonify({"error": f"Valor inválido: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)