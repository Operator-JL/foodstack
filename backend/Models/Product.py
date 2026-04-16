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

        # constructors
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

    @property
    def id(self):
        return self._id
    @id.setter
    def id(self, value):
        self._id = value

    @property
    def category_id(self):
        return self._category_id
    @category_id.setter
    def category_id(self, value):
        self._category_id = value

    @property
    def name(self):
        return self._name
    @name.setter
    def name(self, value):
        self._name = value

    @property
    def description(self):
        return self._description
    @description.setter
    def description(self, value):
        self._description = value

    @property
    def image(self):
        return self._image
    @image.setter
    def image(self, value):
        self._image = value

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
    def load_by_id(self, product_id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT Id, Category_Id, Name, Description, Image, Price, Status, Created_At
                    FROM Products
                    WHERE Id = ?
                """, product_id)

                row = cursor.fetchone()
                if row:
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
                else:
                    raise RecordNotFoundException(f"Product with id {product_id} was not found.")
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
                    SELECT Id, Category_Id, Name, Description, Image, Price, Status, Created_At
                    FROM Products
                    ORDER BY Name
                """)
                for row in cursor.fetchall():
                    list.append(Product(*row))
        except Exception as ex:
            print("error fetching products...", ex)
        return list

    def to_json(self):
        return json.dumps({
            "id": self._id,
            "category_id": self._category_id,
            "name": self._name,
            "description": self._description,
            "image": self._image,
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
        except Exception as ex:
            raise ex