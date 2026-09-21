-- Create a table for clinic-wide holidays (e.g. Festivals, Public Holidays)
CREATE TABLE IF NOT EXISTS public.clinic_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(clinic_id, holiday_date)
);

-- Enable RLS
ALTER TABLE public.clinic_holidays ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can view their clinic holidays"
    ON public.clinic_holidays FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM staff WHERE id = auth.uid()));

CREATE POLICY "Super admins can manage clinic holidays"
    ON public.clinic_holidays FOR ALL
    USING (EXISTS (
        SELECT 1 FROM clinics WHERE clinics.id = clinic_holidays.clinic_id AND clinics.email = auth.jwt()->>'email'
    ));

-- Update the get_clinic_calendar_events RPC to include historical data for inactive doctors
-- By default, the ClinicContext filters out inactive doctors, but for the calendar, 
-- we want to see their past leaves and shifts.
CREATE OR REPLACE FUNCTION get_clinic_calendar_events(
    p_clinic_id UUID,
    p_year INT,
    p_month INT,
    p_doctor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    doctor_id UUID,
    doctor_name VARCHAR,
    date DATE,
    start_time TIME,
    end_time TIME,
    is_leave BOOLEAN,
    leave_reason VARCHAR,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dds.id,
        dds.doctor_id,
        s.name AS doctor_name,
        dds.date,
        dds.start_time,
        dds.end_time,
        dds.is_leave,
        dds.leave_reason,
        s.is_active
    FROM doctor_daily_settings dds
    JOIN staff s ON s.id = dds.doctor_id
    WHERE dds.clinic_id = p_clinic_id
      AND EXTRACT(YEAR FROM dds.date) = p_year
      AND EXTRACT(MONTH FROM dds.date) = p_month
      AND (p_doctor_id IS NULL OR dds.doctor_id = p_doctor_id);
      
    -- Note: The frontend handles holidays separately by fetching from clinic_holidays
END;
$$;
