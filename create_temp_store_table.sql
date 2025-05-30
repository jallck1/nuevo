-- Crear tabla temporal para tiendas
CREATE TABLE IF NOT EXISTS public.temp_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    admin_owner_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) pero con políticas que permitan la inserción
ALTER TABLE public.temp_stores ENABLE ROW LEVEL SECURITY;

-- Política que permite a los usuarios autenticados insertar en la tabla
CREATE POLICY "Permitir inserción a usuarios autenticados"
ON public.temp_stores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política que permite a los usuarios ver solo sus propias tiendas
CREATE POLICY "Permitir ver tiendas propias"
ON public.temp_stores
FOR SELECT
TO authenticated
USING (auth.uid() = admin_owner_id);
