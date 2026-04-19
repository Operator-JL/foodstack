import json
from ..Infrastructure.SQLServerConnection import *
from .order_product import OrderProduct

class RecordNotFoundException(Exception):
    pass

class Order:
    def __init__(self, *args):
        self._id = 0
        self._user_id = 0
        self._total = 0.0
        self._datetime = None
        self._status = "pending"
        self._created_at = None

        # constructors
        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) == 6:
            (
                self._id,
                self._user_id,
                self._total,
                self._datetime,
                self._status,
                self._created_at
            ) = args

    @property
    def id(self):
        return self._id
    @id.setter
    def id(self, value):
        self._id = value

    @property
    def user_id(self):
        return self._user_id
    @user_id.setter
    def user_id(self, value):
        self._user_id = value

    @property
    def total(self):
        return self._total
    @total.setter
    def total(self, value):
        self._total = value

    @property
    def datetime(self):
        return self._datetime
    @datetime.setter
    def datetime(self, value):
        self._datetime = value

    @property
    def status(self):
        return self._status
    @status.setter
    def status(self, value):
        self._status = value

    @property
    def created_at(self):
        return self._created_at
    @created_at.setter
    def created_at(self, value):
        self._created_at = value

    # GET BY ID
    def load_by_id(self, order_id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, User_Id, Total, Datetime, Status, Created_At
                    FROM Orders
                    WHERE Id = ?
                """, order_id)

                row = cursor.fetchone()
                if row:
                    (
                        self._id,
                        self._user_id,
                        self._total,
                        self._datetime,
                        self._status,
                        self._created_at
                    ) = row
                else:
                    raise RecordNotFoundException(f"Order with id {order_id} was not found.")
        except Exception as e:
            raise e

    @staticmethod
    def get_by_order_product_id(order_product_id, conn):
        list = []
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT Id, Order_Product_Id, Ingredient_Id, Quantity, Status, Created_At
                FROM Order_Product_Ingredients
                WHERE Order_Product_Id = ?
            """, order_product_id)

            for row in cursor.fetchall():
                (
                    _id,
                    _order_product_id,
                    _ingredient_id,
                    _quantity,
                    _status,
                    _created_at
                ) = row

                list.append({
                    "id": _id,
                    "order_product_id": _order_product_id,
                    "ingredient_id": _ingredient_id,
                    "quantity": _quantity,
                    "status": _status,
                    "created_at": _created_at.isoformat() if _created_at else None
                })

        except Exception as ex:
            raise ex

        return list

    @staticmethod
    def get_by_order_id(order_id, conn):
        list = []
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT Id, Order_Id, Product_Id, Quantity, Price, Status, Created_At
                FROM Order_Products
                WHERE Order_Id = ?
            """, order_id)

            for row in cursor.fetchall():
                op = OrderProduct(*row)

                # 🔥 NEW: get ingredients per order_product
                ingredients = OrderProductIngredient.get_by_order_product_id(op.id, conn)

                list.append({
                    "id": op.id,
                    "order_id": op.order_id,
                    "product_id": op.product_id,
                    "quantity": op.quantity,
                    "price": float(op.price),
                    "status": op.status,
                    "created_at": op.created_at.isoformat() if op.created_at else None,
                    "ingredients": ingredients   # 👈 nested here
                })

        except Exception as ex:
            raise ex

        return list

    def details(self, conn):
        self.load_by_id(self._id)

        products = OrderProduct.get_by_order_id(self._id, conn)

        return {
            "id": self._id,
            "user_id": self._user_id,
            "total": float(self._total),
            "datetime": self._datetime.isoformat() if self._datetime else None,
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None,
            "order_products": products
        }



    # GET ALL
    @staticmethod
    def get_all():
        list = []
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, User_Id, Total, Datetime, Status, Created_At
                    FROM Orders
                    ORDER BY Id DESC
                """)
                for row in cursor.fetchall():
                    list.append(Order(*row))
        except Exception as ex:
            print("error fetching orders...", ex)
        return list

    def to_json(self):
        return json.dumps({
            "id": self._id,
            "user_id": self._user_id,
            "total": float(self._total),
            "datetime": self._datetime.isoformat() if self._datetime else None,
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None
        })

    # INSERT
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Orders (User_Id, Total, Status)
                    VALUES (?, ?, ?)
                """, (
                    self._user_id,
                    self._total,
                    self._status
                ))
                conn.commit()
        except Exception as ex:
            raise ex