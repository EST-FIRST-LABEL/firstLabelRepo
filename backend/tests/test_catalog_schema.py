from sqlalchemy import create_engine, inspect, text


def test_catalog_schema_upgrades_an_existing_products_table():
    from app.core.db import ensure_catalog_schema

    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE products ("
                "product_id INTEGER PRIMARY KEY, "
                "name VARCHAR(255) NOT NULL"
                ")"
            )
        )

    ensure_catalog_schema(engine)

    columns = {column["name"] for column in inspect(engine).get_columns("products")}
    assert {"report_no", "allergy_info", "nutrition_info"}.issubset(columns)
