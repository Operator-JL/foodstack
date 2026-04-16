from flask import Flask, render_template, redirect, url_for, jsonify
import os
from dotenv import load_dotenv
from backend.Controllers.UserController import user_bp
from backend.Controllers.CategoryController import category_bp
from backend.Controllers.ProductController import product_bp

load_dotenv()
 
server = os.getenv("SQL_SERVER")

app = Flask(__name__)

app.secret_key = "secret_key"

app.register_blueprint(user_bp, url_prefix="/api")
app.register_blueprint(category_bp, url_prefix="/api")
app.register_blueprint(product_bp, url_prefix="/api")


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