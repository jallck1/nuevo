-- Verificar la restricción de la tabla orders
SELECT 
    tc.table_schema, 
    tc.table_name, 
    tc.constraint_name, 
    pg_get_constraintdef(c.oid) as constraint_definition
FROM 
    information_schema.table_constraints tc
    JOIN pg_constraint c ON c.conname = tc.constraint_name
WHERE 
    tc.table_name = 'orders'
    AND tc.constraint_type = 'CHECK';

-- Ver los valores únicos actuales en la columna status
SELECT DISTINCT status 
FROM orders 
WHERE status IS NOT NULL 
ORDER BY status;
