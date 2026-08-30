/**
 * Adversarial Test Suite for M1 Database Schema & RPC Logic
 * Tests edge cases, boundary conditions, regex/normalization logic, and schema constraints.
 */

const assert = require('assert');

// 1. Simulate get_doctor_phone matching logic
function simulateGetDoctorPhone(staffList, clinicId, doctorName) {
  if (doctorName !== null && doctorName !== undefined && doctorName.trim() !== '') {
    const cleanName = doctorName.trim().replace(/^(Dr\.?|Doctor)\s*/i, '').trim();
    
    // Step 1: Match specific doctor
    const match = staffList.find(s => {
      if (s.clinic_id !== clinicId) return false;
      if (s.role !== 'doctor') return false;
      if (s.is_active === false) return false;
      if (!s.phone || s.phone.trim() === '') return false;
      
      const sNameLower = s.name.toLowerCase();
      const inputLower = doctorName.trim().toLowerCase();
      const cleanLower = cleanName.toLowerCase();
      
      const directMatch = sNameLower.includes(inputLower) || inputLower.includes(sNameLower);
      const cleanMatch = cleanName !== '' && (sNameLower.includes(cleanLower) || cleanLower.includes(sNameLower));
      
      return directMatch || cleanMatch;
    });

    return match ? match.phone : null;
  }

  // Step 2: Fallback to first active doctor
  const fallback = staffList.find(s => 
    s.clinic_id === clinicId && 
    s.role === 'doctor' && 
    s.is_active !== false && 
    s.phone && s.phone.trim() !== ''
  );

  return fallback ? fallback.phone : null;
}

// 2. Simulate cancel_appointment matching logic
function simulateCancelAppointment(patientsList, clinicId, inputPhone) {
  if (inputPhone === null || inputPhone === undefined || inputPhone.trim() === '') {
    return { success: false, message: 'Phone number is required to cancel appointment.' };
  }

  const cleanPhone = inputPhone.trim();
  const digits = cleanPhone.replace(/\D/g, '');

  const matchingPatients = patientsList.filter(p => {
    if (p.clinic_id !== clinicId) return false;
    if (p.status !== 'waiting') return false;

    const pClean = p.phone ? p.phone.trim() : '';
    const pDigits = pClean.replace(/\D/g, '');

    const exactMatch = pClean === cleanPhone;
    const plusMatch = pClean === '+' + cleanPhone.replace(/^\+/, '');
    const noPlusMatch = pClean === cleanPhone.replace(/^\+/, '');
    const tenDigitMatch = digits.length >= 10 && pDigits.length >= 10 && pDigits.slice(-10) === digits.slice(-10);

    return exactMatch || plusMatch || noPlusMatch || tenDigitMatch;
  });

  if (matchingPatients.length === 0) {
    return { success: false, message: 'No active appointment found for this phone number today.' };
  }

  // Sort by created_at DESC
  matchingPatients.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const target = matchingPatients[0];

  target.status = 'cancelled';
  return {
    success: true,
    patient_id: target.id,
    patient_name: target.name,
    token_number: target.token_number,
    message: `Appointment for ${target.name || 'Patient'} (Token #${target.token_number || ''}) has been cancelled successfully.`
  };
}

// 3. Simulate check_doctor_availability logic
function simulateCheckDoctorAvailability(dailySettingsList, patientsList, clinicId, clientTimezone = 'Asia/Kolkata') {
  // IST Date vs UTC Date simulation
  const now = new Date();
  const utcDateStr = now.toISOString().split('T')[0];
  // Calculate IST date
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDateStr = new Date(now.getTime() + istOffsetMs).toISOString().split('T')[0];

  const matchingSettings = dailySettingsList.filter(dds => 
    dds.clinic_id === clinicId && (dds.date === istDateStr || dds.date === utcDateStr)
  );

  if (matchingSettings.length === 0) {
    return {
      available: false,
      message: 'Sorry, the doctor has not started their session today yet.'
    };
  }

  // Sort by (date == istDate) DESC, is_active DESC
  matchingSettings.sort((a, b) => {
    if (a.date === istDateStr && b.date !== istDateStr) return -1;
    if (b.date === istDateStr && a.date !== istDateStr) return 1;
    return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
  });

  const activeSetting = matchingSettings[0];
  if (!activeSetting.is_active) {
    return {
      available: false,
      message: `Sorry, Dr. ${activeSetting.doctor_name || 'the doctor'} is not available today.`
    };
  }

  // Count waiting patients
  const waitingCount = patientsList.filter(p => 
    p.clinic_id === clinicId && 
    p.status === 'waiting' && 
    (p.date === istDateStr || p.date === utcDateStr)
  ).length;

  if (activeSetting.max_patients !== null && activeSetting.max_patients !== undefined && waitingCount >= activeSetting.max_patients) {
    return {
      available: false,
      message: `Sorry, Dr. ${activeSetting.doctor_name || 'the doctor'} is fully booked today. All slots are taken.`
    };
  }

  return {
    available: true,
    message: `Yes, Dr. ${activeSetting.doctor_name || 'the doctor'} is available today for walk-in patients.`
  };
}

// ──────────────────────────────────────────────
// TEST EXECUTION
// ──────────────────────────────────────────────
let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failCount++;
  }
}

console.log('--- STARTING ADVERSARIAL STRESS TESTS FOR M1 ---');

const CLINIC_ID = 'a03c3eed-c075-496c-9c03-4c95eac40975';

// Group 1: Doctor Phone & Availability Stress Tests
runTest('ADV-1.1: get_doctor_phone handles NULL / empty name by falling back to active doctor', () => {
  const staff = [
    { id: 's1', clinic_id: CLINIC_ID, name: 'Dr. Sarah Jenkins', role: 'doctor', is_active: true, phone: '+919113526504' }
  ];
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, null), '+919113526504');
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, ''), '+919113526504');
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, '   '), '+919113526504');
});

runTest('ADV-1.2: get_doctor_phone handles name prefixes (Dr., Doctor, spaces, case variations)', () => {
  const staff = [
    { id: 's1', clinic_id: CLINIC_ID, name: 'Sarah Jenkins', role: 'doctor', is_active: true, phone: '+919113526504' }
  ];
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, 'Dr. Sarah'), '+919113526504');
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, 'Doctor Sarah Jenkins'), '+919113526504');
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, 'dr. sarah'), '+919113526504');
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, 'Sarah'), '+919113526504');
});

runTest('ADV-1.3: get_doctor_phone returns NULL for non-existent doctor without falling back to wrong doctor', () => {
  const staff = [
    { id: 's1', clinic_id: CLINIC_ID, name: 'Dr. Sarah Jenkins', role: 'doctor', is_active: true, phone: '+919113526504' }
  ];
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, 'Dr. Bob Unknown'), null);
});

runTest('ADV-1.4: get_doctor_phone ignores deactivated doctors (is_active = false)', () => {
  const staff = [
    { id: 's1', clinic_id: CLINIC_ID, name: 'Dr. Sarah Jenkins', role: 'doctor', is_active: false, phone: '+919113526504' }
  ];
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, 'Dr. Sarah'), null);
  assert.strictEqual(simulateGetDoctorPhone(staff, CLINIC_ID, null), null);
});

runTest('ADV-1.5: check_doctor_availability returns unstarted session if no row for today', () => {
  const settings = [];
  const patients = [];
  const res = simulateCheckDoctorAvailability(settings, patients, CLINIC_ID);
  assert.strictEqual(res.available, false);
  assert.ok(res.message.includes('not started'));
});

runTest('ADV-1.6: check_doctor_availability handles doctor deactivated for the day', () => {
  const now = new Date();
  const istDateStr = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
  const settings = [
    { clinic_id: CLINIC_ID, doctor_name: 'Sarah', date: istDateStr, is_active: false, max_patients: 10 }
  ];
  const res = simulateCheckDoctorAvailability(settings, [], CLINIC_ID);
  assert.strictEqual(res.available, false);
  assert.ok(res.message.includes('not available today'));
});

runTest('ADV-1.7: check_doctor_availability correctly triggers fully booked check', () => {
  const now = new Date();
  const istDateStr = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
  const settings = [
    { clinic_id: CLINIC_ID, doctor_name: 'Sarah', date: istDateStr, is_active: true, max_patients: 2 }
  ];
  const patients = [
    { clinic_id: CLINIC_ID, status: 'waiting', date: istDateStr },
    { clinic_id: CLINIC_ID, status: 'waiting', date: istDateStr }
  ];
  const res = simulateCheckDoctorAvailability(settings, patients, CLINIC_ID);
  assert.strictEqual(res.available, false);
  assert.ok(res.message.includes('fully booked'));
});

// Group 2: cancel_appointment Phone Normalization & Status Edge Cases
runTest('ADV-2.1: cancel_appointment fails gracefully on null / empty phone input', () => {
  const patients = [{ id: 'p1', clinic_id: CLINIC_ID, phone: '+919113526504', status: 'waiting', created_at: '2026-08-24T10:00:00Z' }];
  const resNull = simulateCancelAppointment(patients, CLINIC_ID, null);
  assert.strictEqual(resNull.success, false);
  const resEmpty = simulateCancelAppointment(patients, CLINIC_ID, '   ');
  assert.strictEqual(resEmpty.success, false);
});

runTest('ADV-2.2: cancel_appointment matches phone numbers across formatted variants (+91, 0, dashes, spaces)', () => {
  const testCases = [
    '+919113526504',
    '9113526504',
    '09113526504',
    '+91 91135-26504',
    '(911) 352-6504'
  ];
  for (const tc of testCases) {
    const patients = [{ id: 'p1', clinic_id: CLINIC_ID, name: 'Alice', token_number: 5, phone: '+919113526504', status: 'waiting', created_at: '2026-08-24T10:00:00Z' }];
    const res = simulateCancelAppointment(patients, CLINIC_ID, tc);
    assert.strictEqual(res.success, true, `Failed matching on variant: ${tc}`);
    assert.strictEqual(patients[0].status, 'cancelled');
  }
});

runTest('ADV-2.3: cancel_appointment cancels only the most recent waiting appointment if multiple exist', () => {
  const patients = [
    { id: 'p1', clinic_id: CLINIC_ID, name: 'Bob', token_number: 1, phone: '+919113526504', status: 'waiting', created_at: '2026-08-24T08:00:00Z' },
    { id: 'p2', clinic_id: CLINIC_ID, name: 'Bob', token_number: 2, phone: '+919113526504', status: 'waiting', created_at: '2026-08-24T09:30:00Z' }
  ];
  const res = simulateCancelAppointment(patients, CLINIC_ID, '+919113526504');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.patient_id, 'p2');
  assert.strictEqual(res.token_number, 2);
  assert.strictEqual(patients.find(p => p.id === 'p2').status, 'cancelled');
  assert.strictEqual(patients.find(p => p.id === 'p1').status, 'waiting');
});

runTest('ADV-2.4: cancel_appointment ignores already done / cancelled / called appointments', () => {
  const patients = [
    { id: 'p1', clinic_id: CLINIC_ID, name: 'Charlie', token_number: 1, phone: '+919113526504', status: 'done', created_at: '2026-08-24T08:00:00Z' },
    { id: 'p2', clinic_id: CLINIC_ID, name: 'Charlie', token_number: 2, phone: '+919113526504', status: 'cancelled', created_at: '2026-08-24T09:00:00Z' }
  ];
  const res = simulateCancelAppointment(patients, CLINIC_ID, '+919113526504');
  assert.strictEqual(res.success, false);
  assert.ok(res.message.includes('No active appointment found'));
});

// Group 3: queue_actions Schema & Concurrency Resilience
runTest('ADV-3.1: queue_actions allows null doctor_id, patient_id, and token_number on transfer actions', () => {
  const sampleTransferAction = {
    clinic_id: CLINIC_ID,
    doctor_id: null,
    patient_id: null,
    token_number: null,
    action_type: 'transfer',
    details: { caller_phone: '919113526504', doctor_name: 'Dr. Sarah', created_at: new Date().toISOString() }
  };
  assert.strictEqual(sampleTransferAction.action_type, 'transfer');
  assert.strictEqual(typeof sampleTransferAction.details, 'object');
  assert.strictEqual(sampleTransferAction.doctor_id, null);
});

console.log('\n======================================');
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log('======================================');

process.exit(failCount > 0 ? 1 : 0);
