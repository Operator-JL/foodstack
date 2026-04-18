from flask import jsonify, Blueprint, request
import json

from backend.Models.product import Product
from backend.Models.category import Category
from backend.Models.ingredient import Ingredient
from backend.Infrastructure.SQLServerConnection import SQLServerConnection
from ..Security.Auth import require_auth

product_bp = Blueprint('product_bp', __name__)

#GET
@product_bp.route('/products', methods=['GET'])
def get_products():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(p.to_json()) for p in Product.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@product_bp.route('/product/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    try:
        p = Product(product_id)

        category = Category(p.category_id)
        conn = SQLServerConnection.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT i.id, i.name, i.extra_price, ip.default_ingredients
            FROM ingredients i
            INNER JOIN Product_ingredients ip 
                ON i.id = ip.ingredient_id
            WHERE ip.product_id = ?
            AND ip.status = 1
        """, (product_id,))

        ingredients = []
        for row in cursor.fetchall():
            ingredients.append({
                "id": row[0],
                "name": row[1],
                "extra_price": float(row[2]),
                "is_default": bool(row[3])
            })

        data = json.loads(p.to_json())

        data["category"] = json.loads(category.to_json())
        data["ingredients"] = ingredients

        return jsonify({
            "status": 0,
            "data": data
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#POST
@product_bp.route('/product', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        p = Product()

        p.category_id = data.get("category_id")
        p.name = data.get("name")
        p.description = data.get("description")
        p.image = data.get("image")
        p.price = data.get("price")
        p.status = data.get("status", 1)

        p.add()

        return jsonify({
            "status": 0,
            "message": "Product created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })