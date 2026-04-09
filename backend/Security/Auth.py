import jwt
import datetime
from functools import wraps
from flask import request,jsonify, redirect, url_for
from jwt import ExpiredSignatureError, InvalidTokenError

SECRET_KEY = "9876543210"

def generate_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=20),
        "iat": datetime.datetime.utcnow()
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

# DECODE token
def decode_token(token):
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])


# middleware require_auth
def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        # Receive token from request
        token = request.cookies.get("auth_token")

        if not token:
            return jsonify({
                'status' : 1,
                'errorMessage': "Not authenticated"
            }), 401
            #return redirect(url_for("home"))
        
        try: #success
            decoded = decode_token(token)
            #Save user_id in request
            request.user_id = decoded.get("user_id")
            #return redirect(url_for("dashboard"))

        except ExpiredSignatureError:
            return jsonify({
                "status" : 1,
                "errorMessage" : "Session Expired"
            }), 401
            #return redirect(url_for("home"))

        except InvalidTokenError:
            return jsonify({
                "status": 1,
                "errorMessage": "Invalid Session"
            }), 401
        
        return f(*args, **kwargs)
    
    return wrapper

    @wraps(f)
    def wrapper(*args, **kwargs):
        # receive token
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({
                "status": 1,
                "errorMessage": "Token Missing"
            }), 401

        # remove "bearer" prefix
        token = token.replace("Bearer ", "").strip()

        try:
            decoded = decode_token(token)
            # save user_id in request
            request.user_id = decoded.get("user_id")
        except ExpiredSignatureError:
            return jsonify({
                "status": 1,
                "errorMessage": "Token Expired"
            }), 401
        except InvalidTokenError:
            return jsonify({
                "status": 1,
                "errorMessage": "Invalid Token"
            }), 401
        except Exception as e:
            return jsonify({
                "status": 1,
                "errorMessage": "Authentication error"
            }), 401

        return f(*args, **kwargs)

    return wrapper