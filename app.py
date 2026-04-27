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
        # 🔥 NUEVOS DATOS (ENGORDA)
        peso_inicial   = float(data['peso_inicial'])
        peso_objetivo  = float(data['peso_objetivo'])
        tipo = data.get('tipo', 'normal')
        genetica     = float(data.get('genetica', 1.0))
        alimentacion = float(data.get('alimentacion', 1.0))
        manejo       = float(data.get('manejo', 1.0))
        costo_dia = float(data.get('costo_dia', 50))
        precio_kg = float(data.get('precio_kg', 60))

        # ✅ VALIDACIONES
        if peso_inicial <= 40:
            return jsonify({"error": "El peso inicial debe ser mayor a 40."}), 400

        if peso_objetivo <= peso_inicial:
            return jsonify({"error": "El peso objetivo debe ser mayor al peso inicial."}), 400


        # 🔥 SIMULACIÓN
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

        # 🔥 ESTADO DEL SISTEMA
        if peso_final < peso_objetivo:
            estado = "No alcanza peso objetivo"
            recomendacion = "Mejorar alimentación o manejo para alcanzar el peso de venta."
        elif resultado["dia_venta"] < 100:
            estado = "Engorda rápida"
            recomendacion = "Excelente rendimiento, podrías rotar ganado más rápido."
        else:
            estado = "Engorda normal"
            recomendacion = "Crecimiento adecuado para producción estándar."

        return jsonify({
            "resultado": resultado,
            "estado": estado,
            "recomendacion": recomendacion,
            "venta": {
                "dia": resultado["dia_venta"],
                "peso": resultado["peso_venta"]
            }
        })

    except KeyError as e:
        return jsonify({"error": f"Falta el campo: {e}"}), 400
    except ValueError as e:
        return jsonify({"error": f"Valor inválido: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)