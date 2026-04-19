import json
from ..Infrastructure.SQLServerConnection import *

class RecordNotFoundException(Exception):
    pass


class Product:
    def __init__(self, *args):
        self._id = 0
        self._category_id = 0
        self._name = ""
        self._description = ""
        self._image = ""
        self._price = 0.0
        self._status = 1
        self._created_at = None

        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) == 8:
            (
                self._id,
                self._category_id,
                self._name,
                self._description,
                self._image,
                self._price,
                self._status,
                self._created_at
            ) = args

    # -------------------------
    # PROPERTIES
    # -------------------------
    @property
    def id(self): return self._id

    @property
    def category_id(self): return self._category_id
    @category_id.setter
    def category_id(self, value): self._category_id = value

    @property
    def name(self): return self._name
    @name.setter
    def name(self, value): self._name = value

    @property
    def description(self): return self._description
    @description.setter
    def description(self, value): self._description = value

    @property
    def image(self): return self._image
    @image.setter
    def image(self, value): self._image = value

    @property
    def price(self): return self._price
    @price.setter
    def price(self, value): self._price = value

    @property
    def status(self): return self._status
    @status.setter
    def status(self, value): self._status = value

    @property
    def created_at(self): return self._created_at

    # -------------------------
    # DB METHODS
    # -------------------------
    def load_by_id(self, product_id):
        with SQLServerConnection.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT Id, Category_Id, Name, Description, Image, Price, Status, Created_At
                FROM Products
                WHERE Id = ?
            """, (product_id,))

            row = cursor.fetchone()

            if not row:
                raise RecordNotFoundException(f"Product {product_id} not found")

            (
                self._id,
                self._category_id,
                self._name,
                self._description,
                self._image,
                self._price,
                self._status,
                self._created_at
            ) = row

    @staticmethod
    def get_all():
        products = []
        with SQLServerConnection.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT Id, Category_Id, Name, Description, Image, Price, Status, Created_At
                FROM Products
                WHERE Status = 1
                ORDER BY Name
            """)

            for row in cursor.fetchall():
                products.append(Product(*row))

        return products

    # -------------------------
    # DETAILS (IMPORTANT)
    # -------------------------
    def get_ingredients(self, conn):
        cursor = conn.cursor()

        cursor.execute("""
            SELECT i.id, i.name, i.extra_price, ip.default_ingredients
            FROM ingredients i
            INNER JOIN Product_ingredients ip 
                ON i.id = ip.ingredient_id
            WHERE ip.product_id = ?
            AND ip.status = 1
        """, (self._id,))

        ingredients = []
        for row in cursor.fetchall():
            ingredients.append({
                "id": row[0],
                "name": row[1],
                "extra_price": float(row[2]),
                "is_default": bool(row[3])
            })

        return ingredients

    def to_dict(self):
        return {
            "id": self._id,
            "category_id": self._category_id,
            "name": self._name,
            "description": self._description,
            "image": self._image,
            "price": float(self._price),
            "status": self._status,
            "created_at": self._created_at.isoformat() if self._created_at else None
        }

    # FULL DATA (like GET by id)
    def details(self, conn):
        from .category import Category

        data = self.to_dict()

        category = Category(self._category_id)

        data["category"] = json.loads(category.to_json())
        data["ingredients"] = self.get_ingredients(conn)

        return data

    # GET ALL 
    @staticmethod
    def get_all():
        result = []

        with SQLServerConnection.get_connection() as conn:
            products = Product.get_all()

            for p in products:
                result.append(p.details(conn))

        return result

    # -------------------------
    # INSERT
    # -------------------------
    def add(self):
        with SQLServerConnection.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO Products (Category_Id, Name, Description, Image, Price, Status)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                self._category_id,
                self._name,
                self._description,
                self._image,
                self._price,
                self._status
            ))
            conn.commit()