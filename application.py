from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return "FoodStack API Running"

@app.route("/api/test")
def test():
    return jsonify({
        "status": "ok",
        "message": "API funcionando"
    })