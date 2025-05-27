-- Verificar la estructura de la tabla payments
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'payments';

-- Verificar las políticas de RLS (Row Level Security)
SELECT * FROM pg_policies WHERE tablename = 'payments';

-- Verificar los permisos
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'payments';
