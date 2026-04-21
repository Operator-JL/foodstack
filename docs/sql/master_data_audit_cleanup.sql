/*
FoodStack - Master Data Audit / Cleanup Guide
---------------------------------------------
- This script is for manual DB auditing and controlled corrections.
- Review each SELECT output before applying any UPDATE/DELETE.
- Run in a transaction in non-production first.
*/

/* ============================================================
   1) QUICK INVENTORY
   ============================================================ */

-- Categories
SELECT Id, Name, Status, Created_At
FROM Categories
ORDER BY Id;

-- Products
SELECT Id, Category_Id, Name, Description, Price, Status, Created_At
FROM Products
ORDER BY Id;

-- Ingredients
SELECT Id, Name, Extra_Price, Status, Created_At
FROM Ingredients
ORDER BY Id;

-- Product_Ingredients relations
SELECT Id, Product_Id, Ingredient_Id, Max_Ingredients, Default_Ingredients, Status, Created_At
FROM Product_Ingredients
ORDER BY Id;


/* ============================================================
   2) PRODUCT-CATEGORY CONSISTENCY
   ============================================================ */

-- Full product-category join
SELECT
    p.Id AS Product_Id,
    p.Name AS Product_Name,
    p.Category_Id,
    c.Name AS Category_Name,
    p.Price,
    p.Status AS Product_Status,
    c.Status AS Category_Status
FROM Products p
LEFT JOIN Categories c ON c.Id = p.Category_Id
ORDER BY p.Id;

-- Products with invalid/missing category
SELECT
    p.Id,
    p.Name,
    p.Category_Id,
    p.Price
FROM Products p
LEFT JOIN Categories c ON c.Id = p.Category_Id
WHERE c.Id IS NULL;

-- Suspicious prices (adjust thresholds if needed)
SELECT
    p.Id,
    p.Name,
    p.Price,
    p.Category_Id
FROM Products p
WHERE p.Price IS NULL
   OR p.Price <= 0
   OR p.Price < 0.50
   OR p.Price > 99.99
ORDER BY p.Price DESC;


/* ============================================================
   3) CATEGORY QUALITY CHECKS
   ============================================================ */

-- Duplicate category names (case/trim insensitive)
SELECT
    LOWER(LTRIM(RTRIM(Name))) AS Normalized_Name,
    COUNT(*) AS Total
FROM Categories
GROUP BY LOWER(LTRIM(RTRIM(Name)))
HAVING COUNT(*) > 1;

-- Category names that look like placeholders / garbage
SELECT Id, Name, Status
FROM Categories
WHERE LOWER(LTRIM(RTRIM(Name))) IN
(
    'test', 'demo', 'tmp', 'temp', 'sample',
    'foo', 'bar', 'lorem', 'ipsum', 'none', 'null', 'n/a', 'jose'
);


/* ============================================================
   4) INGREDIENT QUALITY CHECKS
   ============================================================ */

-- Duplicate ingredient names (case/trim insensitive)
SELECT
    LOWER(LTRIM(RTRIM(Name))) AS Normalized_Name,
    COUNT(*) AS Total
FROM Ingredients
GROUP BY LOWER(LTRIM(RTRIM(Name)))
HAVING COUNT(*) > 1;

-- Ingredients with suspicious pricing
SELECT Id, Name, Extra_Price, Status
FROM Ingredients
WHERE Extra_Price IS NULL
   OR Extra_Price < 0
   OR Extra_Price > 50;

-- Ingredients that look like placeholders / garbage
SELECT Id, Name, Status
FROM Ingredients
WHERE LOWER(LTRIM(RTRIM(Name))) IN
(
    'test', 'demo', 'tmp', 'temp', 'sample',
    'foo', 'bar', 'lorem', 'ipsum', 'none', 'null', 'n/a'
);


/* ============================================================
   5) PRODUCT-INGREDIENT RELATION INTEGRITY
   ============================================================ */

-- Orphan relations: missing product or ingredient
SELECT
    pi.Id,
    pi.Product_Id,
    p.Name AS Product_Name,
    pi.Ingredient_Id,
    i.Name AS Ingredient_Name,
    pi.Max_Ingredients,
    pi.Default_Ingredients,
    pi.Status
FROM Product_Ingredients pi
LEFT JOIN Products p ON p.Id = pi.Product_Id
LEFT JOIN Ingredients i ON i.Id = pi.Ingredient_Id
WHERE p.Id IS NULL OR i.Id IS NULL
ORDER BY pi.Id;

-- Duplicate product-ingredient relations
SELECT
    Product_Id,
    Ingredient_Id,
    COUNT(*) AS Total
FROM Product_Ingredients
GROUP BY Product_Id, Ingredient_Id
HAVING COUNT(*) > 1;

-- Invalid max/default combinations
SELECT
    Id,
    Product_Id,
    Ingredient_Id,
    Max_Ingredients,
    Default_Ingredients,
    Status
FROM Product_Ingredients
WHERE Max_Ingredients < 0
   OR Max_Ingredients > 20
   OR (Default_Ingredients = 1 AND Max_Ingredients = 0);


/* ============================================================
   6) EXAMPLE CORRECTIONS (REVIEW BEFORE RUNNING)
   ============================================================ */

-- USE TRANSACTION FOR SAFE MANUAL CLEANUP
-- BEGIN TRANSACTION;

-- Example A: rename or deactivate garbage category "Jose"
-- Option 1 (rename):
-- UPDATE Categories
-- SET Name = 'Drinks'
-- WHERE LOWER(LTRIM(RTRIM(Name))) = 'jose';

-- Option 2 (deactivate):
-- UPDATE Categories
-- SET Status = 0
-- WHERE LOWER(LTRIM(RTRIM(Name))) = 'jose';

-- Example B: fix suspicious product prices
-- UPDATE Products
-- SET Price = 10.99
-- WHERE Name = 'Double Stack Burger' AND Price = 109.99;

-- UPDATE Products
-- SET Price = 4.99
-- WHERE Name = 'Curly Fries' AND Price = 49.99;

-- Example C: re-map products to valid categories (replace IDs as needed)
-- UPDATE Products
-- SET Category_Id = 2
-- WHERE Name = 'Double Stack Burger';

-- Example D: remove orphan product-ingredient relations
-- DELETE pi
-- FROM Product_Ingredients pi
-- LEFT JOIN Products p ON p.Id = pi.Product_Id
-- LEFT JOIN Ingredients i ON i.Id = pi.Ingredient_Id
-- WHERE p.Id IS NULL OR i.Id IS NULL;

-- Example E: remove duplicate product-ingredient rows, keep smallest Id
-- WITH ranked AS (
--     SELECT
--         Id,
--         Product_Id,
--         Ingredient_Id,
--         ROW_NUMBER() OVER (
--             PARTITION BY Product_Id, Ingredient_Id
--             ORDER BY Id
--         ) AS rn
--     FROM Product_Ingredients
-- )
-- DELETE FROM ranked WHERE rn > 1;

-- COMMIT TRANSACTION;
-- ROLLBACK TRANSACTION; -- use this instead of COMMIT while testing
