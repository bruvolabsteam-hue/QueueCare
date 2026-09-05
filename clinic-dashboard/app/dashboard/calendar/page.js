/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import styles from './calendar.module.css';

export default function CalendarPage() {
  const supabase = createClient();

  // State
  const [clinicId, setClinicId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isLeave, setIsLeave] = useState(false);
  const [leaveReason, setLeaveReason] = useState('On Leave');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timePerPatient, setTimePerPatient] = useState(10);
  const [maxPatients, setMaxPatients] = useState('');
  const [queueMode, setQueueMode] = useState('walk-in');
  
  // Range Support
  const [isRange, setIsRange] = useState(false);
  const [rangeEndDateStr, setRangeEndDateStr] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize
  useEffect(() => {
    initClinicAndDoctors();
  }, []);

  // Fetch events whenever month, clinic, or doctor filter changes
  useEffect(() => {
    if (clinicId) {
      fetchEvents();
    }
  }, [clinicId, currentDate, selectedDoctorFilter]);

  async function initClinicAndDoctors() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from('staff')
        .select('clinic_id')
        .eq('email', user.email)
        .single();

      if (!staffData?.clinic_id) return;
      setClinicId(staffData.clinic_id);

      // Fetch all active doctors for dropdowns
      const { data: docs } = await supabase
        .from('staff')
        .select('id, name, specialization')
        .eq('clinic_id', staffData.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true)
        .order('name');

      setDoctors(docs || []);
      if (docs && docs.length > 0) {
        setSelectedDoctorId(docs[0].id);
      }
    } catch (err) {
      console.error('Error initializing calendar:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get start and end of the visible month grid
  function getGridDateRange() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Day of week for first day (0 = Sun, 1 = Mon...)
    const startDayIndex = firstDayOfMonth.getDay();
    const startDate = new Date(year, month, 1 - startDayIndex);

    // End date to complete 35 or 42 grid cells
    const remainingDays = 6 - lastDayOfMonth.getDay();
    const endDate = new Date(year, month + 1, remainingDays);

    return {
      startDateStr: startDate.toISOString().split('T')[0],
      endDateStr: endDate.toISOString().split('T')[0]
    };
  }

  async function fetchEvents() {
    if (!clinicId) return;
    const { startDateStr, endDateStr } = getGridDateRange();

    const docIdParam = selectedDoctorFilter === 'all' ? null : selectedDoctorFilter;

    try {
      // 1. Try calling the get_clinic_calendar_events RPC
      const { data, error } = await supabase.rpc('get_clinic_calendar_events', {
        p_clinic_id: clinicId,
        p_start_date: startDateStr,
        p_end_date: endDateStr,
        p_doctor_id: docIdParam
      });

      if (!error && data) {
        setEvents(data);
        return;
      }

      // 2. Fallback query if RPC migration hasn't been executed yet
      let query = supabase
        .from('doctor_daily_settings')
        .select('*, staff(name, specialization)')
        .eq('clinic_id', clinicId)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (docIdParam) {
        query = query.eq('doctor_id', docIdParam);
      }

      const { data: fallbackData } = await query;
      if (fallbackData) {
        const formatted = fallbackData.map(d => ({
          ...d,
          doctor_name: d.staff?.name || 'Doctor',
          specialization: d.staff?.specialization,
          is_leave: d.is_leave || !d.is_active,
          start_time_formatted: d.start_time ? d.start_time.substring(0, 5) : null,
          end_time_formatted: d.end_time ? d.end_time.substring(0, 5) : null
        }));
        setEvents(formatted);
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  }

  // Month navigation
  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function jumpToToday() {
    setCurrentDate(new Date());
  }

  // Open modal on day click or chip click
  function openScheduleModal(dateStr, existingEvent = null) {
    setSelectedDateStr(dateStr);
    setRangeEndDateStr(dateStr);
    setIsRange(false);

    if (existingEvent) {
      setSelectedDoctorId(existingEvent.doctor_id);
      setIsLeave(existingEvent.is_leave || !existingEvent.is_active);
      setLeaveReason(existingEvent.leave_reason || 'On Leave');
      setStartTime(existingEvent.start_time ? existingEvent.start_time.substring(0, 5) : '09:00');
      setEndTime(existingEvent.end_time ? existingEvent.end_time.substring(0, 5) : '17:00');
      setTimePerPatient(existingEvent.time_per_patient_mins || 10);
      setMaxPatients(existingEvent.max_patients || '');
      setQueueMode(existingEvent.mode || 'walk-in');
    } else {
      if (selectedDoctorFilter !== 'all') {
        setSelectedDoctorId(selectedDoctorFilter);
      } else if (doctors.length > 0) {
        setSelectedDoctorId(doctors[0].id);
      }
      setIsLeave(false);
      setLeaveReason('On Leave');
      setStartTime('09:00');
      setEndTime('17:00');
      setTimePerPatient(10);
      setMaxPatients('');
      setQueueMode('walk-in');
    }

    setIsModalOpen(true);
  }

  // Quick preset helper
  function applyPreset(preset) {
    if (preset === 'morning') {
      setStartTime('09:00');
      setEndTime('13:00');
    } else if (preset === 'evening') {
      setStartTime('16:00');
      setEndTime('20:00');
    } else if (preset === 'full') {
      setStartTime('09:00');
      setEndTime('17:00');
    }
  }

  // Save / Update Schedule
  async function handleSaveSchedule(e) {
    e.preventDefault();
    if (!clinicId || !selectedDoctorId || !selectedDateStr) return;

    setSaving(true);
    try {
      // Determine dates to apply to
      let datesToUpdate = [selectedDateStr];
      if (isRange && rangeEndDateStr && rangeEndDateStr >= selectedDateStr) {
        datesToUpdate = [];
        let cur = new Date(selectedDateStr);
        const end = new Date(rangeEndDateStr);
        while (cur <= end) {
          datesToUpdate.push(cur.toISOString().split('T')[0]);
          cur.setDate(cur.getDate() + 1);
        }
      }

      // Check if batch leave RPC exists for multi-day leave
      if (isLeave && datesToUpdate.length > 1) {
        const { error: batchErr } = await supabase.rpc('batch_set_doctor_leaves', {
          p_clinic_id: clinicId,
          p_doctor_id: selectedDoctorId,
          p_from_date: selectedDateStr,
          p_to_date: rangeEndDateStr,
          p_reason: leaveReason
        });

        if (!batchErr) {
          setIsModalOpen(false);
          fetchEvents();
          return;
        }
      }

      // Upsert dates in parallel
      for (const dStr of datesToUpdate) {
        const payload = {
          clinic_id: clinicId,
          doctor_id: selectedDoctorId,
          date: dStr,
          is_active: !isLeave,
          is_leave: isLeave,
          leave_reason: isLeave ? leaveReason : null,
          start_time: isLeave ? null : startTime,
          end_time: isLeave ? null : endTime,
          time_per_patient_mins: isLeave ? 0 : (parseInt(timePerPatient) || 10),
          max_patients: isLeave ? 0 : (maxPatients ? parseInt(maxPatients) : null),
          mode: queueMode,
          setup_confirmed: true
        };

        // Attempt RPC first, fallback to direct upsert
        const { error: rpcErr } = await supabase.rpc('set_doctor_calendar_entry', {
          p_clinic_id: clinicId,
          p_doctor_id: selectedDoctorId,
          p_date: dStr,
          p_is_active: !isLeave,
          p_is_leave: isLeave,
          p_leave_reason: isLeave ? leaveReason : null,
          p_start_time: isLeave ? null : startTime,
          p_end_time: isLeave ? null : endTime,
          p_time_per_patient: isLeave ? 0 : (parseInt(timePerPatient) || 10),
          p_max_patients: isLeave ? 0 : (maxPatients ? parseInt(maxPatients) : null),
          p_mode: queueMode
        });

        if (rpcErr) {
          // Direct Supabase upsert fallback
          await supabase.from('doctor_daily_settings').upsert(payload, {
            onConflict: 'doctor_id, date'
          });
        }
      }

      setIsModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Error saving schedule:', err);
      alert('Error saving schedule: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Delete / Reset entry
  async function handleDeleteEntry() {
    if (!confirm('Remove schedule override for this date? The doctor will revert to default status.')) return;
    setSaving(true);
    try {
      await supabase
        .from('doctor_daily_settings')
        .delete()
        .eq('clinic_id', clinicId)
        .eq('doctor_id', selectedDoctorId)
        .eq('date', selectedDateStr);

      setIsModalOpen(false);
      fetchEvents();
    } catch (err) {
      alert('Error deleting entry: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Calendar Grid Builder
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 = Sun
  const totalDaysInMonth = lastDay.getDate();

  // Days array for rendering
  const daysArray = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    const dateObj = new Date(year, month - 1, d);
    daysArray.push({
      dateObj,
      dateStr: dateObj.toISOString().split('T')[0],
      dayNum: d,
      isCurrentMonth: false
    });
  }

  // Current month days
  const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    daysArray.push({
      dateObj,
      dateStr: dateObj.toISOString().split('T')[0],
      dayNum: i,
      isCurrentMonth: true,
      isToday: dateObj.toISOString().split('T')[0] === todayStr
    });
  }

  // Next month leading days to complete grid (up to multiple of 7)
  const remainingCells = 7 - (daysArray.length % 7);
  if (remainingCells < 7) {
    for (let i = 1; i <= remainingCells; i++) {
      const dateObj = new Date(year, month + 1, i);
      daysArray.push({
        dateObj,
        dateStr: dateObj.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: false
      });
    }
  }

  // Group events by date string
  const eventsByDate = {};
  events.forEach(ev => {
    if (!eventsByDate[ev.date]) {
      eventsByDate[ev.date] = [];
    }
    eventsByDate[ev.date].push(ev);
  });

  return (
    <div className={styles.container}>
      <div className={styles.calendarCard}>
        
        {/* Top Controls Bar */}
        <div className={styles.topBar}>
          <div className={styles.navGroup}>
            <button onClick={jumpToToday} className={styles.todayBtn}>
              Today
            </button>
            <button onClick={prevMonth} className={styles.iconBtn} title="Previous Month">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={nextMonth} className={styles.iconBtn} title="Next Month">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h2 className={styles.monthTitle}>{monthName}</h2>
          </div>

          <div className={styles.rightControls}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Doctor:</label>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className={styles.selectDoctor}
            >
              <option value="all">All Doctors</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => openScheduleModal(todayStr)}
              className={styles.actionBtn}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Set Schedule / Leave
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className={styles.legendBar}>
          <div className={styles.legendItem}>
            <div className={styles.legendDotAvailable}></div>
            <span>Available / Shift Working</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDotLeave}></div>
            <span>On Leave / Off</span>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
            💡 Tip: Click any day cell or doctor badge to update working hours or mark leaves.
          </span>
        </div>

        {/* Calendar Grid */}
        <div className={styles.calendarGrid}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className={styles.weekdayHeader}>
              {day}
            </div>
          ))}

          {daysArray.map((cell, idx) => {
            const dayEvents = eventsByDate[cell.dateStr] || [];

            return (
              <div
                key={idx}
                className={`${styles.dayCell} ${!cell.isCurrentMonth ? styles.dayCellOtherMonth : ''}`}
                onClick={() => openScheduleModal(cell.dateStr)}
              >
                <div className={styles.dayHeader}>
                  <span className={`${styles.dayNum} ${cell.isToday ? styles.dayNumToday : ''}`}>
                    {cell.dayNum}
                  </span>
                  <button className={styles.addQuickBtn} title="Add schedule for this date">
                    +
                  </button>
                </div>

                <div className={styles.eventsContainer}>
                  {dayEvents.map(ev => {
                    const isEvLeave = ev.is_leave || !ev.is_active;

                    return (
                      <div
                        key={ev.id || `${ev.doctor_id}_${ev.date}`}
                        className={`${styles.eventChip} ${isEvLeave ? styles.eventLeave : styles.eventAvailable}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openScheduleModal(cell.dateStr, ev);
                        }}
                        title={
                          isEvLeave
                            ? `${ev.doctor_name}: ${ev.leave_reason || 'On Leave'}`
                            : `${ev.doctor_name}: ${ev.start_time_formatted || '09:00 AM'} - ${ev.end_time_formatted || '05:00 PM'}`
                        }
                      >
                        <div
                          className={`${styles.eventIndicator} ${isEvLeave ? styles.indicatorLeave : styles.indicatorAvailable}`}
                        ></div>
                        <span style={{ fontWeight: 600 }}>{ev.doctor_name}</span>
                        {!isEvLeave && ev.start_time_formatted && (
                          <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>
                            ({ev.start_time_formatted})
                          </span>
                        )}
                        {isEvLeave && (
                          <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>
                            ({ev.leave_reason || 'Off'})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Schedule / Leave Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Schedule Doctor for {selectedDateStr}
              </h3>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              <div className={styles.modalBody}>
                {/* Doctor Selector */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Select Doctor</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className={styles.select}
                    required
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.name} ({d.specialization || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Tabs: Working vs Leave */}
                <div className={styles.typeTabs}>
                  <button
                    type="button"
                    className={`${styles.tabBtn} ${!isLeave ? styles.tabBtnActiveAvailable : ''}`}
                    onClick={() => setIsLeave(false)}
                  >
                    🟢 Available / Shift
                  </button>
                  <button
                    type="button"
                    className={`${styles.tabBtn} ${isLeave ? styles.tabBtnActiveLeave : ''}`}
                    onClick={() => setIsLeave(true)}
                  >
                    🔴 On Leave / Off
                  </button>
                </div>

                {/* Working Shift Form */}
                {!isLeave ? (
                  <>
                    <div className={styles.rowTwo}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Shift Start Time</label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Shift End Time</label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.presetsRow}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', alignSelf: 'center' }}>
                        Quick Presets:
                      </span>
                      <button
                        type="button"
                        onClick={() => applyPreset('morning')}
                        className={styles.presetChip}
                      >
                        Morning (9 AM - 1 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('evening')}
                        className={styles.presetChip}
                      >
                        Evening (4 PM - 8 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('full')}
                        className={styles.presetChip}
                      >
                        Full Day (9 AM - 5 PM)
                      </button>
                    </div>

                    <div className={styles.rowTwo}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Time Per Patient (mins)</label>
                        <input
                          type="number"
                          min="3"
                          max="60"
                          value={timePerPatient}
                          onChange={(e) => setTimePerPatient(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Max Patients (Optional)</label>
                        <input
                          type="number"
                          placeholder="Unlimited"
                          value={maxPatients}
                          onChange={(e) => setMaxPatients(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Queue / Booking Mode</label>
                      <select
                        value={queueMode}
                        onChange={(e) => setQueueMode(e.target.value)}
                        className={styles.select}
                      >
                        <option value="walk-in">Walk-in Queue</option>
                        <option value="appointment">Appointment Only</option>
                        <option value="both">Both Walk-in & Appointment</option>
                      </select>
                    </div>
                  </>
                ) : (
                  /* Leave Form */
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Reason for Leave</label>
                    <input
                      type="text"
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="e.g. Sick Leave, Medical Conference, Holiday"
                      className={styles.input}
                      required
                    />

                    <div className={styles.presetsRow}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', alignSelf: 'center' }}>
                        Presets:
                      </span>
                      {['Sick Leave', 'Vacation', 'Weekly Off', 'Emergency', 'Conference'].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setLeaveReason(r)}
                          className={styles.presetChip}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multi-day Date Range Option */}
                <div style={{ paddingTop: '0.5rem', borderTop: '1px dashed var(--color-border)' }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={isRange}
                      onChange={(e) => setIsRange(e.target.checked)}
                    />
                    <span>Apply to multiple days (Date Range)</span>
                  </label>

                  {isRange && (
                    <div className={styles.rowTwo} style={{ marginTop: '0.5rem' }}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>From Date</label>
                        <input
                          type="date"
                          value={selectedDateStr}
                          onChange={(e) => setSelectedDateStr(e.target.value)}
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>To Date</label>
                        <input
                          type="date"
                          min={selectedDateStr}
                          value={rangeEndDateStr}
                          onChange={(e) => setRangeEndDateStr(e.target.value)}
                          className={styles.input}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={handleDeleteEntry}
                  style={{
                    marginRight: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Reset / Clear Override
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={styles.saveBtn}
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
