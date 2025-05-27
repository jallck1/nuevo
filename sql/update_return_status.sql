-- Función para actualizar el estado de una devolución
CREATE OR REPLACE FUNCTION public.update_return_status(
    p_return_id uuid,
    p_status text,
    p_admin_notes text
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_current_status text;
    v_order_id text;
    v_store_id uuid;
BEGIN
    -- Obtener el estado actual y el order_id
    SELECT status, order_id, store_id 
    INTO v_current_status, v_order_id, v_store_id
    FROM returns 
    WHERE id = p_return_id
    FOR UPDATE;  -- Bloquea la fila para evitar condiciones de carrera
    
    -- Verificar si la devolución existe
    IF v_current_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'La devolución no existe'
        );
    END IF;
    
    -- Verificar si el estado es válido
    IF p_status NOT IN ('Pendiente', 'Aprobada', 'Rechazada', 'Completada') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Estado no válido'
        );
    END IF;
    
    -- Actualizar la devolución
    UPDATE returns 
    SET 
        status = p_status,
        admin_notes = p_admin_notes,
        updated_at = now()
    WHERE id = p_return_id
    RETURNING to_jsonb(returns.*) INTO v_result;
    
    -- Si se aprobó la devolución, actualizar el stock
    IF p_status = 'Aprobada' AND v_current_status != 'Aprobada' THEN
        -- Aquí iría la lógica para actualizar el stock
        -- Por ahora solo registramos que se debería actualizar el stock
        RAISE NOTICE 'Devolución aprobada, se debe actualizar el stock para la orden %', v_order_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'data', v_result,
        'message', 'Devolución actualizada correctamente'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error al actualizar la devolución: ' || SQLERRM
        );
END;
$$;
