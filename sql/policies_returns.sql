-- Habilitar RLS en la tabla returns si no está habilitado
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Política para permitir que los usuarios vean solo las devoluciones de su tienda
CREATE POLICY "Los usuarios pueden ver las devoluciones de su tienda"
ON returns
FOR SELECT
USING (
    store_id IN (
        SELECT store_id 
        FROM user_stores 
        WHERE user_id = auth.uid()
    )
);

-- Política para permitir que los administradores de tienda actualicen devoluciones
CREATE POLICY "Los administradores pueden actualizar las devoluciones de su tienda"
ON returns
FOR UPDATE
USING (
    store_id IN (
        SELECT store_id 
        FROM user_stores 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    store_id IN (
        SELECT store_id 
        FROM user_stores 
        WHERE user_id = auth.uid()
    )
);

-- Política para permitir que los administradores inserten devoluciones
CREATE POLICY "Los administradores pueden insertar devoluciones en su tienda"
ON returns
FOR INSERT
WITH CHECK (
    store_id IN (
        SELECT store_id 
        FROM user_stores 
        WHERE user_id = auth.uid()
    )
);

-- Política para permitir que los administradores eliminen devoluciones
CREATE POLICY "Los administradores pueden eliminar las devoluciones de su tienda"
ON returns
FOR DELETE
USING (
    store_id IN (
        SELECT store_id 
        FROM user_stores 
        WHERE user_id = auth.uid()
    )
);
