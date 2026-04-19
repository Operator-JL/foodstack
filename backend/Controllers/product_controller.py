from flask import jsonify, Blueprint, request
from backend.Models.product import Product, RecordNotFoundException
from backend.Infrastructure.SQLServerConnection import SQLServerConnection
from ..Security.Auth import require_auth

product_bp = Blueprint('product_bp', __name__)


# -------------------------
# GET ALL 
# -------------------------
@product_bp.route('/products', methods=['GET'])
def get_all():
    try:
        return jsonify({
            "status": 0,
            "data": Product.get_all_details()
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })


# -------------------------
# GET BY ID
# -------------------------
@product_bp.route('/product/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    try:
        with SQLServerConnection.get_connection() as conn:
            p = Product(product_id)

            return jsonify({
                "status": 0,
                "data": p.details(conn)
            })

    except RecordNotFoundException as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })


# -------------------------
# CREATE
# -------------------------
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