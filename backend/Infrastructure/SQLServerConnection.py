import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

class SQLServerConnection:
    @staticmethod
    def get_connection():
        server = os.getenv("SQL_SERVER")
        database = os.getenv("DATABASE")
        username = os.getenv("SQL_USER")
        password = os.getenv("SQL_PASSWORD")

        missing = []
        if not server:
            missing.append("SQL_SERVER")
        if not database:
            missing.append("DATABASE")
        if not username:
            missing.append("SQL_USER")
        if not password:
            missing.append("SQL_PASSWORD")

        if missing:
            raise RuntimeError(
                f"Missing SQL configuration variable(s): {', '.join(missing)}."
            )

        connectionString = (
            "Driver={ODBC Driver 18 for SQL Server};"
            f"SERVER=tcp:{server},1433;"
            f"DATABASE={database};"
            f"UID={username};"
            f"PWD={password};"
            "TrustServerCertificate=no;"
            "Encrypt=yes;"
            "Connection Timeout=30;"
        )
        try:
            connection = pyodbc.connect(connectionString)
            connection.setencoding("utf8")
            connection.setdecoding(pyodbc.SQL_CHAR, encoding="utf8")
            connection.setdecoding(pyodbc.SQL_WCHAR, encoding="utf8")
        except Exception as ex:
            raise ConnectionError(f"Could not connect to SQL server: {str(ex)}") from ex
        return connection



