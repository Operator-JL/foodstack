/*
FoodStack - Catalog/Images/Ingredients Audit (Real DB)
======================================================
Purpose:
- Diagnose catalog gaps (why only 2 products appear, bad categories, bad prices)
- Diagnose missing images and relation issues
- Prepare controlled cleanup queries (commented by default)
*/

/* ---------------------------------------------------
   1) Catalog overview
--------------------------------------------------- */

-- Categories currently in DB
SELECT Id, Name, Status, Created_At
FROM Categories
ORDER BY Id;

-- Products currently in DB
SELECT Id, Category_Id, Name, Price, Image, Status, Created_At
FROM Products
ORDER BY Id;

-- Product count by status (explains visible catalog count)
SELECT Status, COUNT(*) AS Total
FROM Products
GROUP BY Status
ORDER BY Status DESC;

-- Active products only (real catalog endpoint behavior)
SELECT Id, Category_Id, Name, Price, Image, Status
FROM Products
WHERE Status = 1
ORDER BY Name;


/* ---------------------------------------------------
   2) Categories and bad values
--------------------------------------------------- */

-- Product-category join
SELECT
    p.Id AS ProductId,
    p.Name AS ProductName,
    p.Status AS ProductStatus,
    p.Price,
    p.Image,
    c.Id AS CategoryId,
    c.Name AS CategoryName,
    c.Status AS CategoryStatus
FROM Products p
LEFT JOIN Categories c ON c.Id = p.Category_Id
ORDER BY c.Name, p.Name;

-- Categories outside real business catalog
SELECT Id, Name, Status
FROM Categories
WHERE LOWER(LTRIM(RTRIM(Name))) NOT IN ('burgers', 'tacos', 'burritos', 'drinks', 'sides');

-- Expected categories missing or inactive
WITH expected_categories AS (
    SELECT v.Name
    FROM (VALUES ('Burgers'), ('Tacos'), ('Burritos'), ('Drinks'), ('Sides')) AS v(Name)
)
SELECT
    e.Name AS ExpectedCategory,
    c.Id AS ExistingId,
    c.Status
FROM expected_categories e
LEFT JOIN Categories c
  ON LOWER(LTRIM(RTRIM(c.Name))) = LOWER(e.Name)
WHERE c.Id IS NULL OR c.Status <> 1
ORDER BY e.Name;

-- Categories explicitly known as garbage placeholders
SELECT Id, Name, Status
FROM Categories
WHERE LOWER(LTRIM(RTRIM(Name))) IN
('jose', 'test', 'demo', 'tmp', 'temp', 'sample', 'foo', 'bar', 'none', 'null', 'n/a');


/* ---------------------------------------------------
   3) Product quality and images
--------------------------------------------------- */

-- Suspicious prices
SELECT Id, Name, Price, Category_Id, Status
FROM Products
WHERE Price IS NULL
   OR Price <= 0
   OR Price < 0.50
   OR Price > 99.99
ORDER BY Price DESC;

-- Products without useful image value
SELECT Id, Name, Category_Id, Image, Status
FROM Products
WHERE Image IS NULL OR LTRIM(RTRIM(Image)) = ''
ORDER BY Id;

-- Products whose image is not a local asset path (for migration planning)
SELECT Id, Name, Image
FROM Products
WHERE Image IS NOT NULL
  AND LTRIM(RTRIM(Image)) <> ''
  AND LOWER(Image) NOT LIKE 'assets/images/%'
ORDER BY Id;

-- Active products mapped to invalid categories
SELECT
    p.Id,
    p.Name,
    p.Category_Id,
    c.Name AS CategoryName,
    p.Status
FROM Products p
LEFT JOIN Categories c ON c.Id = p.Category_Id
WHERE p.Status = 1
  AND (
    c.Id IS NULL OR
    LOWER(LTRIM(RTRIM(c.Name))) NOT IN ('burgers', 'tacos', 'burritos', 'drinks', 'sides')
  )
ORDER BY p.Id;

-- Expected local-image slug candidates (for manual mapping table prep)
SELECT
    Id,
    Name,
    LOWER(
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(LTRIM(RTRIM(Name)), '&', ' and '),
                    '''', ''
                ),
                ' ', '-'
            ),
            '--', '-'
        )
    ) AS SuggestedSlug
FROM Products
ORDER BY Id;


/* ---------------------------------------------------
   4) Ingredients and relations
--------------------------------------------------- */

SELECT Id, Name, Extra_Price, Status, Created_At
FROM Ingredients
ORDER BY Id;

-- Duplicate ingredient names (case + trim insensitive)
SELECT LOWER(LTRIM(RTRIM(Name))) AS NormalizedName, COUNT(*) AS Total
FROM Ingredients
GROUP BY LOWER(LTRIM(RTRIM(Name)))
HAVING COUNT(*) > 1;

-- Product_Ingredients records
SELECT Id, Product_Id, Ingredient_Id, Max_Ingredients, Default_Ingredients, Status, Created_At
FROM Product_Ingredients
ORDER BY Id;

-- Active products without active ingredient links
SELECT p.Id, p.Name, p.Category_Id, p.Status
FROM Products p
LEFT JOIN Product_Ingredients pi
  ON pi.Product_Id = p.Id
 AND pi.Status = 1
WHERE p.Status = 1
GROUP BY p.Id, p.Name, p.Category_Id, p.Status
HAVING COUNT(pi.Id) = 0
ORDER BY p.Name;

-- Orphan product-ingredient relations
SELECT
    pi.Id,
    pi.Product_Id,
    p.Name AS ProductName,
    pi.Ingredient_Id,
    i.Name AS IngredientName,
    pi.Status
FROM Product_Ingredients pi
LEFT JOIN Products p ON p.Id = pi.Product_Id
LEFT JOIN Ingredients i ON i.Id = pi.Ingredient_Id
WHERE p.Id IS NULL OR i.Id IS NULL
ORDER BY pi.Id;

-- Duplicate product-ingredient relations
SELECT Product_Id, Ingredient_Id, COUNT(*) AS Total
FROM Product_Ingredients
GROUP BY Product_Id, Ingredient_Id
HAVING COUNT(*) > 1;


/* ---------------------------------------------------
   5) REVIEW-ONLY cleanup examples (commented)
--------------------------------------------------- */

-- BEGIN TRANSACTION;

-- REVIEW ONLY: rename known bad category
-- UPDATE Categories
-- SET Name = 'Drinks'
-- WHERE LOWER(LTRIM(RTRIM(Name))) = 'jose';

-- REVIEW ONLY: deactivate invalid categories
-- UPDATE Categories
-- SET Status = 0
-- WHERE LOWER(LTRIM(RTRIM(Name))) NOT IN ('burgers', 'tacos', 'burritos', 'drinks', 'sides');

-- REVIEW ONLY: fix known suspicious prices
-- UPDATE Products
-- SET Price = 10.99
-- WHERE Name = 'Double Stack Burger' AND Price = 109.99;

-- UPDATE Products
-- SET Price = 4.99
-- WHERE Name = 'Curly Fries' AND Price = 49.99;

-- REVIEW ONLY: remap products to valid categories (replace IDs as needed)
-- UPDATE Products
-- SET Category_Id = 5 -- e.g. Drinks
-- WHERE Name = 'Some Drink';

-- REVIEW ONLY: remove orphan relations
-- DELETE pi
-- FROM Product_Ingredients pi
-- LEFT JOIN Products p ON p.Id = pi.Product_Id
-- LEFT JOIN Ingredients i ON i.Id = pi.Ingredient_Id
-- WHERE p.Id IS NULL OR i.Id IS NULL;

-- REVIEW ONLY: dedupe relations (keep smallest Id)
-- WITH ranked AS (
--   SELECT Id, Product_Id, Ingredient_Id,
--          ROW_NUMBER() OVER (PARTITION BY Product_Id, Ingredient_Id ORDER BY Id) AS rn
--   FROM Product_Ingredients
-- )
-- DELETE FROM ranked WHERE rn > 1;

-- COMMIT TRANSACTION;
-- ROLLBACK TRANSACTION;
