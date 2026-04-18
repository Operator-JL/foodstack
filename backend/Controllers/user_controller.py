from flask import jsonify, Blueprint, request, make_response
import json

from backend.Models.user import User
from ..Security.Auth import require_auth, generate_token

user_bp = Blueprint('user_bp', __name__)

#GET
@user_bp.route('/users', methods=['GET'])
def get_user():
    try:
        return jsonify({
            "status": 0,
            "data": [json.loads(u.to_json()) for u in User.get_all()]
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })

#GET by id
@user_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_by_id(user_id):
    try:
        u = User(user_id)
        return jsonify({
            "status": 0,
            "data": json.loads(u.to_json())
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })
    
#POST
@user_bp.route('/user', methods=['POST'])
def create_user():
    try:
        data = request.get_json()
        u = User()

        u.name = data.get("name")
        u.lastname = data.get("lastname")
        u.phoneNumber = data.get("phoneNumber")
        u.email = data.get("email")
        u.password = data.get("password")

        # REQUIRED fields for your table
        u.role = data.get("role")
        u.status = 1

        u.add()

        return jsonify({
            "status": 0,
            "message": "User created successfully"
        })
    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })


@user_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()

        if not data or "email" not in data or "password" not in data:
            return jsonify({
                'status': 1,
                'errorMessage': "Email and password are required."
            }), 400
        
        u = User.get_by_email(data["email"])

        if not u or not u.check_password(data["password"]):
            return jsonify({
                'status': 1,
                'errorMessage': "Invalid credentials."
            }), 401
        
        token = generate_token(u.id)

        response = make_response(jsonify({
            "status": 0,
            "user": json.loads(u.to_json())
        }))

        response.set_cookie(
            "auth_token",
            token,
            httponly=True,
            secure=False,
            samesite="Lax",
            max_age=60 * 60 * 10
        )

        return response

    except Exception as ex:
        return jsonify({
            "status": 2,
            "errorMessage": str(ex)
        }), 400


@user_bp.route("/logout", methods=["POST"])
def logout():
    response = jsonify({
        "status": 0,
        "message": "Logged Out"
    })

    response.delete_cookie("auth_token")

    return response

#PUT
@user_bp.route('/user/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    try:
        data = request.get_json()

        u = User(user_id)

        # Solo actualiza si viene en el request
        if "name" in data:
            u.name = data.get("name")

        if "lastname" in data:
            u.lastname = data.get("lastname")

        if "phoneNumber" in data:
            u.phoneNumber = data.get("phoneNumber")

        if "email" in data:
            u.email = data.get("email")

        if "password" in data:
            u.password = data.get("password")

        if "role" in data:
            u.role = data.get("role")

        if "status" in data:
            u.status = data.get("status")

        u.update()

        return jsonify({
            "status": 0,
            "message": "User updated successfully"
        })

    except Exception as e:
        return jsonify({
            "status": 1,
            "errorMessage": str(e)
        })