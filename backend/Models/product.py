import json
from ..Infrastructure.SQLServerConnection import *

class RecordNotFoundException(Exception):
    pass

# -------------------------
# ATTRIBUTES
# -------------------------
class Product:
    def __init__(self, *args):
        self._id = 0
        self._category_id = 0
        self._category_name = ""
        self._name = ""
        self._description = ""
        self._image = ""
        self._price = 0.0
        self._status = 1
        self._ingredient_links = 0
        self._created_at = None

        # Constructors
        if len(args) == 1:
            self.load_by_id(args[0])
        elif len(args) >= 8:
            (
                self._id,
                self._category_id,
                self._name,
                self._description,
                self._image,
                self._price,
                self._status,
                self._created_at
            ) = args[:8]
            if len(args) >= 9:
                self._category_name = args[8] or ""
            if len(args) >= 10:
                self._ingredient_links = int(args[9] or 0)

    # -------------------------
    # PROPERTIES
    # -------------------------
    @property
    def id(self):
        return self._id

    @property
    def category_id(self):
        return self._category_id

    @category_id.setter
    def category_id(self, value):
        self._category_id = value

    @property
    def category_name(self):
        return self._category_name

    @category_name.setter
    def category_name(self, value):
        self._category_name = value or ""

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
    def ingredient_links(self):
        return self._ingredient_links

    @ingredient_links.setter
    def ingredient_links(self, value):
        self._ingredient_links = int(value or 0)

    @property
    def created_at(self):
        return self._created_at

    # -------------------------
    # METHODS
    # -------------------------

    # LOAD BY ID
    # -------------------------
    def load_by_id(self, product_id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT
                        p.Id,
                        p.Category_Id,
                        p.Name,
                        p.Description,
                        p.Image,
                        p.Price,
                        p.Status,
                        p.Created_At,
                        ISNULL(c.Name, '') AS Category_Name,
                        ISNULL(pi_stats.Ingredient_Links, 0) AS Ingredient_Links
                    FROM Products p
                    LEFT JOIN Categories c ON c.Id = p.Category_Id
                    LEFT JOIN (
                        SELECT Product_Id, COUNT(*) AS Ingredient_Links
                        FROM Product_Ingredients
                        WHERE Status = 1
                        GROUP BY Product_Id
                    ) pi_stats ON pi_stats.Product_Id = p.Id
                    WHERE p.Id = ?
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
                    self._created_at,
                    self._category_name,
                    self._ingredient_links
                ) = row

        except Exception as e:
            raise e

    # GET ALL
    # -------------------------
    @staticmethod
    def get_all():
        result = []
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT
                        p.Id,
                        p.Category_Id,
                        p.Name,
                        p.Description,
                        p.Image,
                        p.Price,
                        p.Status,
                        p.Created_At,
                        ISNULL(c.Name, '') AS Category_Name,
                        ISNULL(pi_stats.Ingredient_Links, 0) AS Ingredient_Links
                    FROM Products p
                    LEFT JOIN Categories c ON c.Id = p.Category_Id
                    LEFT JOIN (
                        SELECT Product_Id, COUNT(*) AS Ingredient_Links
                        FROM Product_Ingredients
                        WHERE Status = 1
                        GROUP BY Product_Id
                    ) pi_stats ON pi_stats.Product_Id = p.Id
                    WHERE p.Status = 1
                    ORDER BY p.Name
                """)

                for row in cursor.fetchall():
                    result.append(Product(*row))

        except Exception as ex:
            print("error fetching products...", ex)

        return result

    # TO DICT
    # -------------------------
    def to_dict(self):
        return {
            "id": self._id,
            "category_id": self._category_id,
            "category_name": self._category_name,
            "name": self._name,
            "description": self._description,
            "image": self._image,
            "price": float(self._price),
            "status": self._status,
            "ingredient_links": int(self._ingredient_links),
            "created_at": self._created_at.isoformat() if self._created_at else None
        }

    # TO JSON
    # -------------------------
    def to_json(self):
        return json.dumps(self.to_dict())

    # ADD
    # -------------------------
    def add(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO Products (Category_Id, Name, Description, Image, Price, Status)
                    OUTPUT INSERTED.Id
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    self._category_id,
                    self._name,
                    self._description,
                    self._image,
                    self._price,
                    self._status
                ))

                self._id = cursor.fetchone()[0]
                conn.commit()

                return self._id

        except Exception as ex:
            raise ex

    # UPDATE
    # -------------------------
    def update(self):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE Products
                    SET Category_Id = ?, Name = ?, Description = ?, Image = ?, Price = ?, Status = ?
                    WHERE Id = ?
                """, (
                    self._category_id,
                    self._name,
                    self._description,
                    self._image,
                    self._price,
                    self._status,
                    self._id
                ))

                if cursor.rowcount == 0:
                    raise RecordNotFoundException(f"Product with id {self._id} was not found.")

                conn.commit()

        except Exception as ex:
            raise ex

    # EXISTS BY ID
    @staticmethod
    def exists_by_id(product_id):
        try:
            with SQLServerConnection.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT 1 FROM Products WHERE Id = ?",
                    product_id
                )
                return cursor.fetchone() is not None
        except Exception as ex:
            raise ex
