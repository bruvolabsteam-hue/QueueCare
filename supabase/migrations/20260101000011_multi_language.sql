-- Add regional_language to clinics (the local language for WhatsApp messages)
-- This is separate from default_language. English is always sent + this regional language.
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS regional_language VARCHAR DEFAULT 'hi';

-- Translation helper function
-- Returns translated message parts for token assignment based on language code
CREATE OR REPLACE FUNCTION get_token_message(
  p_lang text,
  p_name text,
  p_token int,
  p_waiting int,
  p_est_time text,
  p_est_wait int
) RETURNS text AS $$
BEGIN
  CASE p_lang
    WHEN 'hi' THEN  -- Hindi
      RETURN 'नमस्ते ' || p_name || '! 🏥' || chr(10) ||
        'आपका टोकन नंबर: *#' || p_token || '*' || chr(10) ||
        'आपसे आगे: ' || p_waiting || ' मरीज़' || chr(10) ||
        'अनुमानित समय: *' || p_est_time || '* (~' || p_est_wait || ' मिनट)' || chr(10) ||
        'कृपया अपनी बारी से 5 मिनट पहले पहुँचें।';

    WHEN 'kn' THEN  -- Kannada
      RETURN 'ನಮಸ್ಕಾರ ' || p_name || '! 🏥' || chr(10) ||
        'ನಿಮ್ಮ ಟೋಕನ್ ಸಂಖ್ಯೆ: *#' || p_token || '*' || chr(10) ||
        'ನಿಮ್ಮ ಮುಂದೆ: ' || p_waiting || ' ರೋಗಿಗಳು' || chr(10) ||
        'ಅಂದಾಜು ಸಮಯ: *' || p_est_time || '* (~' || p_est_wait || ' ನಿಮಿಷ)' || chr(10) ||
        'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸರದಿಗೆ 5 ನಿಮಿಷ ಮುಂಚೆ ಬನ್ನಿ.';

    WHEN 'ta' THEN  -- Tamil
      RETURN 'வணக்கம் ' || p_name || '! 🏥' || chr(10) ||
        'உங்கள் டோக்கன் எண்: *#' || p_token || '*' || chr(10) ||
        'உங்களுக்கு முன்: ' || p_waiting || ' நோயாளிகள்' || chr(10) ||
        'மதிப்பிடப்பட்ட நேரம்: *' || p_est_time || '* (~' || p_est_wait || ' நிமிடங்கள்)' || chr(10) ||
        'உங்கள் முறைக்கு 5 நிமிடங்களுக்கு முன் வரவும்.';

    WHEN 'ml' THEN  -- Malayalam
      RETURN 'നമസ്കാരം ' || p_name || '! 🏥' || chr(10) ||
        'നിങ്ങളുടെ ടോക്കൺ നമ്പർ: *#' || p_token || '*' || chr(10) ||
        'നിങ്ങളുടെ മുന്നിൽ: ' || p_waiting || ' രോഗികൾ' || chr(10) ||
        'കണക്കാക്കിയ സമയം: *' || p_est_time || '* (~' || p_est_wait || ' മിനിറ്റ്)' || chr(10) ||
        'ദയവായി നിങ്ങളുടെ ഊഴത്തിന് 5 മിനിറ്റ് മുമ്പ് വരൂ.';

    WHEN 'te' THEN  -- Telugu
      RETURN 'నమస్కారం ' || p_name || '! 🏥' || chr(10) ||
        'మీ టోకెన్ నంబర్: *#' || p_token || '*' || chr(10) ||
        'మీ ముందు: ' || p_waiting || ' రోగులు' || chr(10) ||
        'అంచనా సమయం: *' || p_est_time || '* (~' || p_est_wait || ' నిమిషాలు)' || chr(10) ||
        'దయచేసి మీ వంతు రాకముందు 5 నిమిషాలు ముందుగా రండి.';

    WHEN 'mr' THEN  -- Marathi
      RETURN 'नमस्कार ' || p_name || '! 🏥' || chr(10) ||
        'तुमचा टोकन क्रमांक: *#' || p_token || '*' || chr(10) ||
        'तुमच्यापुढे: ' || p_waiting || ' रुग्ण' || chr(10) ||
        'अंदाजे वेळ: *' || p_est_time || '* (~' || p_est_wait || ' मिनिटे)' || chr(10) ||
        'कृपया तुमच्या वेळेच्या 5 मिनिटे आधी या.';

    WHEN 'bn' THEN  -- Bengali
      RETURN 'নমস্কার ' || p_name || '! 🏥' || chr(10) ||
        'আপনার টোকেন নম্বর: *#' || p_token || '*' || chr(10) ||
        'আপনার আগে: ' || p_waiting || ' জন রোগী' || chr(10) ||
        'আনুমানিক সময়: *' || p_est_time || '* (~' || p_est_wait || ' মিনিট)' || chr(10) ||
        'অনুগ্রহ করে আপনার পালার 5 মিনিট আগে আসুন।';

    WHEN 'gu' THEN  -- Gujarati
      RETURN 'નમસ્તે ' || p_name || '! 🏥' || chr(10) ||
        'તમારો ટોકન નંબર: *#' || p_token || '*' || chr(10) ||
        'તમારી આગળ: ' || p_waiting || ' દર્દીઓ' || chr(10) ||
        'અંદાજિત સમય: *' || p_est_time || '* (~' || p_est_wait || ' મિનિટ)' || chr(10) ||
        'કૃપયા તમારા વારાના 5 મિનિટ પહેલા આવો.';

    WHEN 'pa' THEN  -- Punjabi
      RETURN 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ ' || p_name || '! 🏥' || chr(10) ||
        'ਤੁਹਾਡਾ ਟੋਕਨ ਨੰਬਰ: *#' || p_token || '*' || chr(10) ||
        'ਤੁਹਾਡੇ ਅੱਗੇ: ' || p_waiting || ' ਮਰੀਜ਼' || chr(10) ||
        'ਅੰਦਾਜ਼ਨ ਸਮਾਂ: *' || p_est_time || '* (~' || p_est_wait || ' ਮਿੰਟ)' || chr(10) ||
        'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਵਾਰੀ ਤੋਂ 5 ਮਿੰਟ ਪਹਿਲਾਂ ਆਓ।';

    ELSE  -- Default fallback (Hindi)
      RETURN 'नमस्ते ' || p_name || '! 🏥' || chr(10) ||
        'आपका टोकन नंबर: *#' || p_token || '*' || chr(10) ||
        'आपसे आगे: ' || p_waiting || ' मरीज़' || chr(10) ||
        'अनुमानित समय: *' || p_est_time || '* (~' || p_est_wait || ' मिनट)' || chr(10) ||
        'कृपया अपनी बारी से 5 मिनट पहले पहुँचें।';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Override message translation helper
CREATE OR REPLACE FUNCTION get_override_message(
  p_lang text,
  p_name text,
  p_mode text,
  p_position int DEFAULT 0,
  p_wait_mins int DEFAULT 0
) RETURNS text AS $$
BEGIN
  IF p_mode = 'insert_now' THEN
    CASE p_lang
      WHEN 'hi' THEN RETURN 'नमस्ते ' || p_name || '! आपको कतार में फिर से जोड़ दिया गया है। आप अगले हैं। कृपया तुरंत डॉक्टर के कमरे में आएं 🙏';
      WHEN 'kn' THEN RETURN 'ನಮಸ್ಕಾರ ' || p_name || '! ನಿಮ್ಮನ್ನು ಸರತಿಗೆ ಮರು-ಸೇರಿಸಲಾಗಿದೆ. ನೀವು ಮುಂದಿನವರು. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಡಾಕ್ಟರ್ ಕೊಠಡಿಗೆ ಬನ್ನಿ 🙏';
      WHEN 'ta' THEN RETURN 'வணக்கம் ' || p_name || '! நீங்கள் வரிசையில் மீண்டும் சேர்க்கப்பட்டீர்கள். நீங்கள் அடுத்தவர். உடனடியாக மருத்துவர் அறைக்கு வாருங்கள் 🙏';
      WHEN 'ml' THEN RETURN 'നമസ്കാരം ' || p_name || '! നിങ്ങളെ ക്യൂവിൽ തിരികെ ചേർത്തിട്ടുണ്ട്. നിങ്ങളാണ് അടുത്തത്. ദയവായി ഡോക്ടറുടെ മുറിയിലേക്ക് ഉടൻ വരൂ 🙏';
      WHEN 'te' THEN RETURN 'నమస్కారం ' || p_name || '! మిమ్మల్ని క్యూలో తిరిగి చేర్చారు. మీరు తదుపరి. దయచేసి వెంటనే డాక్టర్ గదికి రండి 🙏';
      WHEN 'mr' THEN RETURN 'नमस्कार ' || p_name || '! तुम्हाला रांगेत पुन्हा जोडले आहे. तुम्ही पुढचे आहात. कृपया लगेच डॉक्टरांच्या खोलीत या 🙏';
      WHEN 'bn' THEN RETURN 'নমস্কার ' || p_name || '! আপনাকে সারিতে পুনরায় যোগ করা হয়েছে। আপনি পরবর্তী। অনুগ্রহ করে এখনই ডাক্তারের কক্ষে আসুন 🙏';
      WHEN 'gu' THEN RETURN 'નમસ્તે ' || p_name || '! તમને કતારમાં ફરી ઉમેરવામાં આવ્યા છે. તમે આગળ છો. કૃપયા તરત ડૉક્ટરના રૂમમાં આવો 🙏';
      WHEN 'pa' THEN RETURN 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ ' || p_name || '! ਤੁਹਾਨੂੰ ਕਤਾਰ ਵਿੱਚ ਦੁਬਾਰਾ ਜੋੜਿਆ ਗਿਆ ਹੈ। ਤੁਸੀਂ ਅਗਲੇ ਹੋ। ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ਡਾਕਟਰ ਦੇ ਕਮਰੇ ਵਿੱਚ ਆਓ 🙏';
      ELSE RETURN 'नमस्ते ' || p_name || '! आपको कतार में फिर से जोड़ दिया गया है। आप अगले हैं। कृपया तुरंत डॉक्टर के कमरे में आएं 🙏';
    END CASE;

  ELSIF p_mode = 'add_to_end' THEN
    CASE p_lang
      WHEN 'hi' THEN RETURN 'नमस्ते ' || p_name || '! आपको कतार में #' || p_position || ' स्थान पर जोड़ा गया है। अनुमानित प्रतीक्षा: ~' || p_wait_mins || ' मिनट। कृपया क्लिनिक न छोड़ें 🙏';
      WHEN 'kn' THEN RETURN 'ನಮಸ್ಕಾರ ' || p_name || '! ನಿಮ್ಮನ್ನು ಸರತಿಯಲ್ಲಿ #' || p_position || ' ಸ್ಥಾನದಲ್ಲಿ ಸೇರಿಸಲಾಗಿದೆ. ಅಂದಾಜು ಕಾಯುವಿಕೆ: ~' || p_wait_mins || ' ನಿಮಿಷ. ದಯವಿಟ್ಟು ಕ್ಲಿನಿಕ್ ಬಿಡಬೇಡಿ 🙏';
      WHEN 'ta' THEN RETURN 'வணக்கம் ' || p_name || '! நீங்கள் வரிசையில் #' || p_position || ' இடத்தில் சேர்க்கப்பட்டீர்கள். மதிப்பிட்ட காத்திருப்பு: ~' || p_wait_mins || ' நிமிடங்கள். கிளினிக்கை விட்டு வெளியேற வேண்டாம் 🙏';
      WHEN 'ml' THEN RETURN 'നമസ്കാരം ' || p_name || '! നിങ്ങളെ ക്യൂവിൽ #' || p_position || ' സ്ഥാനത്ത് ചേർത്തിട്ടുണ്ട്. കണക്കാക്കിയ കാത്തിരിപ്പ്: ~' || p_wait_mins || ' മിനിറ്റ്. ദയവായി ക്ലിനിക് വിടരുത് 🙏';
      WHEN 'te' THEN RETURN 'నమస్కారం ' || p_name || '! మిమ్మల్ని క్యూలో #' || p_position || ' స్థానంలో చేర్చారు. అంచనా వేచి ఉండటం: ~' || p_wait_mins || ' నిమిషాలు. దయచేసి క్లినిక్ వదలకండి 🙏';
      WHEN 'mr' THEN RETURN 'नमस्कार ' || p_name || '! तुम्हाला रांगेत #' || p_position || ' स्थानावर जोडले आहे. अंदाजे प्रतीक्षा: ~' || p_wait_mins || ' मिनिटे. कृपया क्लिनिक सोडू नका 🙏';
      WHEN 'bn' THEN RETURN 'নমস্কার ' || p_name || '! আপনাকে সারিতে #' || p_position || ' স্থানে যোগ করা হয়েছে। আনুমানিক অপেক্ষা: ~' || p_wait_mins || ' মিনিট। অনুগ্রহ করে ক্লিনিক ছাড়বেন না 🙏';
      WHEN 'gu' THEN RETURN 'નમસ્તે ' || p_name || '! તમને કતારમાં #' || p_position || ' સ્થાન પર ઉમેરવામાં આવ્યા છે. અંદાજિત રાહ: ~' || p_wait_mins || ' મિનિટ. કૃપયા ક્લિનિક છોડશો નહીં 🙏';
      WHEN 'pa' THEN RETURN 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ ' || p_name || '! ਤੁਹਾਨੂੰ ਕਤਾਰ ਵਿੱਚ #' || p_position || ' ਸਥਾਨ ਤੇ ਜੋੜਿਆ ਗਿਆ ਹੈ। ਅੰਦਾਜ਼ਨ ਉਡੀਕ: ~' || p_wait_mins || ' ਮਿੰਟ। ਕਿਰਪਾ ਕਰਕੇ ਕਲੀਨਿਕ ਨਾ ਛੱਡੋ 🙏';
      ELSE RETURN 'नमस्ते ' || p_name || '! आपको कतार में #' || p_position || ' स्थान पर जोड़ा गया है। अनुमानित प्रतीक्षा: ~' || p_wait_mins || ' मिनट। कृपया क्लिनिक न छोड़ें 🙏';
    END CASE;

  ELSIF p_mode = 'courtesy_delay' THEN
    CASE p_lang
      WHEN 'hi' THEN RETURN 'थोड़ी देरी के लिए क्षमा करें। आपको जल्द ही बुलाया जाएगा। धन्यवाद 🙏';
      WHEN 'kn' THEN RETURN 'ಸ್ವಲ್ಪ ವಿಳಂಬಕ್ಕೆ ಕ್ಷಮಿಸಿ. ನಿಮ್ಮನ್ನು ಶೀಘ್ರದಲ್ಲಿ ಕರೆಯಲಾಗುವುದು. ಧನ್ಯವಾದ 🙏';
      WHEN 'ta' THEN RETURN 'சிறிய தாமதத்திற்கு மன்னிக்கவும். உங்களை விரைவில் அழைப்பார்கள். நன்றி 🙏';
      WHEN 'ml' THEN RETURN 'ചെറിയ കാലതാമസത്തിന് ക്ഷമിക്കൂ. നിങ്ങളെ ഉടൻ വിളിക്കും. നന്ദി 🙏';
      WHEN 'te' THEN RETURN 'చిన్న ఆలస్యానికి క్షమించండి. మిమ్మల్ని త్వరలో పిలుస్తారు. ధన్యవాదాలు 🙏';
      WHEN 'mr' THEN RETURN 'थोड्या विलंबासाठी क्षमस्व. तुम्हाला लवकरच बोलावले जाईल. धन्यवाद 🙏';
      WHEN 'bn' THEN RETURN 'সামান্য বিলম্বের জন্য দুঃখিত। আপনাকে শীঘ্রই ডাকা হবে। ধন্যবাদ 🙏';
      WHEN 'gu' THEN RETURN 'થોડા વિલંબ માટે ક્ષમા કરો. તમને ટૂંક સમયમાં બોલાવવામાં આવશે. આભાર 🙏';
      WHEN 'pa' THEN RETURN 'ਥੋੜੀ ਦੇਰੀ ਲਈ ਮਾਫ਼ੀ। ਤੁਹਾਨੂੰ ਜਲਦੀ ਬੁਲਾਇਆ ਜਾਵੇਗਾ। ਧੰਨਵਾਦ 🙏';
      ELSE RETURN 'थोड़ी देरी के लिए क्षमा करें। आपको जल्द ही बुलाया जाएगा। धन्यवाद 🙏';
    END CASE;
  END IF;

  RETURN '';
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Now update generate_daily_token to use the clinic's regional_language
CREATE OR REPLACE FUNCTION generate_daily_token(
  p_clinic_id uuid, 
  p_name text, 
  p_phone text, 
  p_registration_method text,
  p_language text DEFAULT 'auto',
  p_travel_category text DEFAULT 'here'
)
RETURNS int AS $$
DECLARE
  v_new_token int;
  v_patient_id uuid;
  v_waiting_count int;
  v_avg_time int;
  v_est_wait int;
  v_est_time text;
  v_regional_lang text;
  v_english_msg text;
  v_regional_msg text;
BEGIN
  PERFORM id FROM public.clinics WHERE id = p_clinic_id FOR UPDATE;

  -- Get clinic's regional language
  SELECT COALESCE(regional_language, 'hi') INTO v_regional_lang
  FROM public.clinics WHERE id = p_clinic_id;

  SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_new_token
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND created_at >= date_trunc('day', now());

  -- Count patients currently waiting ahead
  SELECT COUNT(*) INTO v_waiting_count
  FROM public.patients
  WHERE clinic_id = p_clinic_id
    AND status = 'waiting'
    AND created_at >= date_trunc('day', now());

  -- Get clinic's avg time per patient (default 10 mins)
  SELECT COALESCE(avg_time_per_patient_mins, 10) INTO v_avg_time
  FROM public.clinics WHERE id = p_clinic_id;

  v_est_wait := v_waiting_count * v_avg_time;
  v_est_time := to_char(now() + (v_est_wait || ' minutes')::interval, 'HH12:MI AM');

  INSERT INTO public.patients (
    clinic_id, name, phone, language, token_number, queue_position, registration_method, status
  )
  VALUES (
    p_clinic_id, p_name, p_phone, v_regional_lang, v_new_token, v_new_token, 
    p_registration_method::registration_method, 'waiting'
  )
  RETURNING id INTO v_patient_id;

  -- Build English part
  v_english_msg := 'Hello ' || p_name || '! 🏥' || chr(10) ||
    'Your token number is: *#' || v_new_token || '*' || chr(10) ||
    'Patients ahead: ' || v_waiting_count || chr(10) ||
    'Estimated turn: *' || v_est_time || '* (~' || v_est_wait || ' mins)' || chr(10) ||
    'Please arrive 5 minutes before your turn.';

  -- Build regional language part using translation function
  v_regional_msg := get_token_message(v_regional_lang, p_name, v_new_token, v_waiting_count, v_est_time, v_est_wait);

  -- Send bilingual WhatsApp (English + Regional)
  INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
  VALUES (
    p_clinic_id, p_phone, 'token_assigned', 
    v_english_msg || chr(10) || chr(10) || v_regional_msg,
    'pending'
  );

  RETURN v_new_token;
END;
$$ LANGUAGE plpgsql;


-- Update re_insert_token to use clinic's regional_language
CREATE OR REPLACE FUNCTION re_insert_token(p_patient_id uuid, p_mode text, p_staff_id uuid)
RETURNS void AS $$
DECLARE
  v_patient RECORD;
  v_curr_pos NUMERIC;
  v_next_pos NUMERIC;
  v_new_pos NUMERIC;
  v_next_patient RECORD;
  v_max_pos NUMERIC;
  v_queue_length INTEGER;
  v_regional_lang text;
BEGIN
  SELECT * INTO v_patient FROM public.patients WHERE id = p_patient_id;
  IF NOT FOUND OR v_patient.status != 'skipped' THEN
    RAISE EXCEPTION 'Patient not found or not skipped';
  END IF;

  -- Get clinic's regional language
  SELECT COALESCE(regional_language, 'hi') INTO v_regional_lang
  FROM public.clinics WHERE id = v_patient.clinic_id;

  IF p_mode = 'insert_now' THEN
    SELECT queue_position INTO v_curr_pos FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND status = 'called' AND created_at >= date_trunc('day', now()) LIMIT 1;

    SELECT * INTO v_next_patient FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND status = 'waiting' AND created_at >= date_trunc('day', now()) 
    ORDER BY queue_position ASC LIMIT 1;

    IF v_next_patient.id IS NOT NULL THEN
       v_next_pos := v_next_patient.queue_position;
       IF v_curr_pos IS NOT NULL THEN
          v_new_pos := (v_curr_pos + v_next_pos) / 2.0;
       ELSE
          v_new_pos := v_next_pos - 1;
       END IF;
    ELSE
       IF v_curr_pos IS NOT NULL THEN
          v_new_pos := v_curr_pos + 1;
       ELSE
          v_new_pos := v_patient.token_number;
       END IF;
    END IF;

    UPDATE public.patients SET status = 'waiting', queue_position = v_new_pos WHERE id = p_patient_id;

    -- Bilingual insert_now message
    INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
    VALUES (
      v_patient.clinic_id, v_patient.phone, 'insert_now',
      'Hello ' || v_patient.name || '! You are NEXT in the queue. Please come to the doctor''s room immediately 🙏' || chr(10) || chr(10) ||
      get_override_message(v_regional_lang, v_patient.name, 'insert_now'),
      'pending'
    );

    -- Courtesy message to bumped patient
    IF v_next_patient.id IS NOT NULL THEN
       INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
       VALUES (
         v_next_patient.clinic_id, v_next_patient.phone, 'courtesy_delay',
         'Sorry for a small delay. You will be called very shortly. Thank you for your patience 🙏' || chr(10) ||
         get_override_message(v_regional_lang, v_next_patient.name, 'courtesy_delay'),
         'pending'
       );
    END IF;

  ELSIF p_mode = 'add_to_end' THEN
    SELECT COALESCE(MAX(queue_position), 0) INTO v_max_pos FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND created_at >= date_trunc('day', now());

    v_new_pos := v_max_pos + 1;
    
    SELECT COUNT(*) INTO v_queue_length FROM public.patients 
    WHERE clinic_id = v_patient.clinic_id AND status = 'waiting' AND queue_position < v_new_pos AND created_at >= date_trunc('day', now());

    UPDATE public.patients SET status = 'waiting', queue_position = v_new_pos, re_entry_count = re_entry_count + 1 WHERE id = p_patient_id;

    -- Bilingual add_to_end message
    INSERT INTO public.pending_messages (clinic_id, patient_phone, event_type, message_content, status)
    VALUES (
      v_patient.clinic_id, v_patient.phone, 'add_to_end',
      'Hello ' || v_patient.name || '! You have been re-added at position #' || v_new_pos || '. Estimated wait: ~' || (v_queue_length * 10) || ' mins. Please do not leave the clinic 🙏' || chr(10) || chr(10) ||
      get_override_message(v_regional_lang, v_patient.name, 'add_to_end', v_new_pos::int, (v_queue_length * 10)),
      'pending'
    );
  END IF;

  INSERT INTO public.queue_actions (clinic_id, patient_id, token_number, action_type, done_by)
  VALUES (v_patient.clinic_id, p_patient_id, v_patient.token_number, p_mode::queue_action_type, p_staff_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
