from flask import Flask, render_template, redirect, url_for, jsonify
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from backend.Controllers.user_controller import user_bp
from backend.Controllers.category_controller import category_bp
from backend.Controllers.product_controller import product_bp
from backend.Controllers.ingredient_controller import ingredient_bp
from backend.Controllers.order_controller import order_bp
from backend.Controllers.product_ingredient_controller import product_ingredient_bp
from backend.Controllers.order_product_controller import order_product_bp
from backend.Controllers.order_product_ingredient_controller import order_product_ingredient_bp


load_dotenv()
 
server = os.getenv("SQL_SERVER")

app = Flask(__name__)

app.secret_key = "secret_key"

app.register_blueprint(user_bp, url_prefix="/api")
app.register_blueprint(category_bp, url_prefix="/api")
app.register_blueprint(product_bp, url_prefix="/api")
app.register_blueprint(ingredient_bp, url_prefix="/api")
app.register_blueprint(order_bp, url_prefix="/api")
app.register_blueprint(product_ingredient_bp, url_prefix="/api")
app.register_blueprint(order_product_bp, url_prefix="/api")
app.register_blueprint(order_product_ingredient_bp, url_prefix="/api")



@app.route("/")
def home():
    return "FoodStack API Running"


@app.route("/api/test")
def test():
    return jsonify({
        "status": "ok",
        "message": "API funcionando"
    })

@app.after_request
def add_Cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = "GET, POST, PUT, DELETE"
    return response

if __name__ == "__main__":
    app.run(debug=True)