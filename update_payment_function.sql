-- Drop the existing function if it exists
drop function if exists process_payment(uuid, uuid, decimal, text, text, text);

-- Create or replace the function with the status parameter
create or replace function process_payment(
  p_user_id uuid,
  p_store_id uuid,
  p_amount decimal,
  p_payment_method text,
  p_reference_id text default null,
  p_notes text default null,
  p_status text default 'pending'
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_payment_id uuid;
  v_credit_used decimal;
  v_credit_assigned decimal;
  v_new_credit_used decimal;
  v_result jsonb;
  v_allowed_status text[] := array['pending', 'completed', 'failed', 'refunded'];
begin
  -- Validate status
  if p_status is null or not (p_status = any(v_allowed_status)) then
    raise exception 'Invalid status. Allowed values are: %, %, %, %', 
      'pending', 'completed', 'failed', 'refunded';
  end if;

  -- Get current credit values
  select credit_used, credit_assigned 
  into v_credit_used, v_credit_assigned
  from profiles 
  where id = p_user_id
  for update; -- Lock the row for update
  
  -- Calculate new credit used (can't be less than 0)
  v_new_credit_used := greatest(0, v_credit_used - p_amount);
  
  -- Insert payment record
  insert into payments (
    buyer_id,
    store_id,
    amount,
    payment_method,
    reference_id,
    notes,
    status
  ) values (
    p_user_id,
    p_store_id,
    p_amount,
    p_payment_method,
    p_reference_id,
    p_notes,
    p_status
  )
  returning id into v_payment_id;
  
  -- Only update credit if payment is completed
  if p_status = 'completed' then
    update profiles
    set 
      credit_used = v_new_credit_used,
      updated_at = now()
    where id = p_user_id;
  end if;
  
  -- Calculate new available credit
  v_result := jsonb_build_object(
    'payment_id', v_payment_id,
    'previous_credit_used', v_credit_used,
    'new_credit_used', v_new_credit_used,
    'credit_assigned', v_credit_assigned,
    'available_credit', v_credit_assigned - v_new_credit_used,
    'status', p_status
  );
  
  return v_result;
exception
  when others then
    -- Log the error
    raise log 'Error in process_payment: %', SQLERRM;
    -- Re-raise the error
    raise;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function process_payment(uuid, uuid, decimal, text, text, text, text) to authenticated;
