-- Función para obtener información de una columna específica de una tabla
CREATE OR REPLACE FUNCTION get_column_info(
    p_table_name TEXT,
    p_column_name TEXT
) 
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_enum_name TEXT;
    v_enum_values TEXT[];
    v_check_constraint TEXT;
BEGIN
    -- Obtener información básica de la columna
    SELECT 
        jsonb_build_object(
            'data_type', data_type,
            'is_nullable', is_nullable,
            'column_default', column_default,
            'character_maximum_length', character_maximum_length,
            'udt_name', udt_name
        )
    INTO v_result
    FROM information_schema.columns 
    WHERE table_name = p_table_name 
    AND column_name = p_column_name;
    
    -- Si la columna es de tipo enum, obtener sus valores
    SELECT t.typname INTO v_enum_name
    FROM pg_type t 
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_catalog.pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_type t2 ON t2.oid = e.enumtypid
    WHERE t.typname = split_part(v_result->>'udt_name', '_', 2);
    
    IF v_enum_name IS NOT NULL THEN
        SELECT array_agg(e.enumlabel) INTO v_enum_values
        FROM pg_type t 
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_catalog.pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_type t2 ON t2.oid = e.enumtypid
        WHERE t.typname = v_enum_name;
        
        v_result := jsonb_set(
            COALESCE(v_result, '{}'::jsonb), 
            '{enums}', 
            to_jsonb(v_enum_values)
        );
    END IF;
    
    -- Obtener restricciones CHECK
    SELECT pg_get_constraintdef(c.oid) INTO v_check_constraint
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = p_table_name
    AND a.attname = p_column_name
    AND c.contype = 'c';
    
    IF v_check_constraint IS NOT NULL THEN
        v_result := jsonb_set(
            COALESCE(v_result, '{}'::jsonb), 
            '{check_constraint}', 
            to_jsonb(v_check_constraint)
        );
    END IF;
    
    -- Obtener valores únicos existentes
    EXECUTE format('SELECT array_agg(DISTINCT %I) FROM %I WHERE %I IS NOT NULL', 
                  p_column_name, p_table_name, p_column_name)
    INTO v_enum_values;
    
    IF v_enum_values IS NOT NULL AND array_length(v_enum_values, 1) > 0 THEN
        v_result := jsonb_set(
            COALESCE(v_result, '{}'::jsonb), 
            '{existing_values}', 
            to_jsonb(v_enum_values)
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
