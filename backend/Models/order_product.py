import json
from ..Infrastructure.SQLServerConnection import *
from .order_product_ingredient import OrderProductIngredient

class RecordNotFoundException(Exception):
    pass

class OrderProduct:
    def __init__(self, *args):
        self._id = 0
        self._order_id = 0
        self._product_id = 0
        self._quantity = 1
        self._price = 0.0
        self._status = 1
        self._created_at = None

        # constructors
        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) == 7:
            (
                self._id,
                self._order_id,
                self._product_id,
                self._quantity,
                self._price,
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
    def order_id(self):
        return self._order_id
    @order_id.setter
    def order_id(self, value):
        self._order_id = value

    @property
    def product_id(self):
        return self._product_id
    @product_id.setter
    def product_id(self, value):
        self._product_id = value

    @property
    def quantity(self):
        return self._quantity
    @quantity.setter
    def quantity(self, value):
        self._quantity = value

    @property
    def price(self):
        return self._price
    @price.setter
    def price(self, value):
        self._price = value

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
    def load_by_id(self, id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, Order_Id, Product_Id, Quantity, Price, Status, Created_At
                    FROM Order_Products
                    WHERE Id = ?
                """, id)

                row = cursor.fetchone()
                if row:
                    (
                        self._id,
                        self._order_id,
                        self._product_id,
                        self._quantity,
                        self._price,
                        self._status,
                        self._created_at
                    ) = row
                else:
                    raise RecordNotFoundException(f"OrderProduct with id {id} was not found.")
        except Exception as e:
            raise e

    # GET ALL
    @staticmethod
    def get_all():
        list = []
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, Order_Id, Product_Id, Quantity, Price, Status, Created_At
                    FROM Order_Products
                    ORDER BY Id DESC
                """)
                for row in cursor.fetchall():
                    list.append(OrderProduct(*row))
        except Exception as ex:
            print("error fetching order_products...", ex)
        return list

    def to_json(self):
        return json.dumps({
            "id": self._id,
            "order_id": self._order_id,
            "product_id": self._product_id,
            "quantity": self._quantity,
            "price": float(self._price),
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None
        })

    # INSERT
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Order_Products (Order_Id, Product_Id, Quantity, Price, Status)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    self._order_id,
                    self._product_id,
                    self._quantity,
                    self._price,
                    self._status
                ))
                conn.commit()
        except Exception as ex:
            raise ex