from flask import jsonify, Blueprint, request
from backend.Models.product import Product, RecordNotFoundException
from backend.Infrastructure.SQLServerConnection import SQLServerConnection
from ..Security.Auth import require_auth, require_roles

product_bp = Blueprint('product_bp', __name__)
STAFF_ROLES = {"admin", "staff", "manager"}

# GET ALL
# -------------------------
@product_bp.route('/products', methods=['GET'])
def get_all():
    try:
        return jsonify({
            "status": 0,
            "data": [p.to_dict() for p in Product.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

# GET BY ID
# -------------------------
@product_bp.route('/product/<int:product_id>', methods=['GET'])
@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    try:
        p = Product(product_id)
        return jsonify({
            "status": 0,
            "data": p.to_dict()
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

# POST
# -------------------------
@product_bp.route('/product', methods=['POST'])
@product_bp.route('/products', methods=['POST'])
@require_auth
@require_roles(*STAFF_ROLES)
def create_product():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "status": 1,
                "errorMessage": "JSON body is required."
            }), 400

        name = str(data.get("name") or "").strip()
        if not name:
            return jsonify({
                "status": 1,
                "errorMessage": "name is required."
            }), 400

        p = Product()
        p.category_id = data.get("category_id")
        p.name = name
        p.description = data.get("description")
        p.image = data.get("image")
        p.price = data.get("price")
        p.status = data.get("status", 1)

        new_id = p.add()

        return jsonify({
            "status": 0,
            "message": "Product created successfully",
            "data": {
                "id": new_id
            }
        }), 201

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        }), 500


# PUT
# -------------------------
@product_bp.route('/product/<int:product_id>', methods=['PUT'])
@product_bp.route('/products/<int:product_id>', methods=['PUT'])
@require_auth
@require_roles(*STAFF_ROLES)
def update_product(product_id):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({
                "status": 1,
                "errorMessage": "JSON body is required."
            }), 400

        p = Product(product_id)

        p.category_id = data.get("category_id", p.category_id)
        p.name = data.get("name", p.name)
        p.description = data.get("description", p.description)
        p.image = data.get("image", p.image)
        p.price = data.get("price", p.price)
        p.status = data.get("status", p.status)

        p.update()

        return jsonify({
            "status": 0,
            "message": "Product updated successfully"
        }), 200

    except RecordNotFoundException as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        }), 404

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        }), 500
