from flask import Flask, jsonify
from backend.Controllers.UserController import user_bp

app = Flask(__name__)

# Register Blueprint
app.register_blueprint(user_bp, url_prefix="/api")


@app.route("/")
def home():
    return "FoodStack API Running"


@app.route("/api/test")
def test():
    return jsonify({
        "status": "ok",
        "message": "API funcionando"
    })


if __name__ == "__main__":
    app.run(debug=True)