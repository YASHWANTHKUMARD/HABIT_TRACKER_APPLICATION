import { useState, useEffect } from 'react'
import './index.css'

type Habit = {
  id: string,
  name: string,
  startDate?: string,
  endDate?: string
}

type DayData = {
  date: string,
  habits: Record<string, boolean>,
  mood: string,
  notes: string
}

const ALL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function App() {
  const [activeMonth, setActiveMonth] = useState('January')
  const [trackerData, setTrackerData] = useState<Record<string, DayData>>({})
  const [habitsList, setHabitsList] = useState<Habit[]>([])
  
  // New Habit Form
  const [newHabitName, setNewHabitName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedDayObj, setSelectedDayObj] = useState<DayData | null>(null)

  // Helper to format Date cleanly in local timezone (YYYY-MM-DD)
  const formatLocalDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const todayStr = formatLocalDate(new Date())

  useEffect(() => {
    const savedData = localStorage.getItem('habitTrackerData')
    const savedHabits = localStorage.getItem('habitsList')
    
    if (savedHabits) setHabitsList(JSON.parse(savedHabits))

    if (savedData) {
      const parsed = JSON.parse(savedData);
      setTrackerData(parsed);
    } else {
      const start = new Date(2026, 0, 1) // Jan 1
      const end = new Date(2026, 11, 31) // Dec 31
      const initialData: Record<string, DayData> = {}
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = formatLocalDate(d)
        initialData[dateStr] = { date: dateStr, habits: {}, mood: '-', notes: '' }
      }
      setTrackerData(initialData)
    }
  }, [])

  useEffect(() => {
    if (Object.keys(trackerData).length > 0) {
      localStorage.setItem('habitTrackerData', JSON.stringify(trackerData))
    }
    localStorage.setItem('habitsList', JSON.stringify(habitsList))
  }, [trackerData, habitsList])

  const isHabitActiveOnDate = (habit: Habit, dateStr: string) => {
    if (habit.startDate && dateStr < habit.startDate) return false;
    if (habit.endDate && dateStr > habit.endDate) return false;
    return true;
  }

  const toggleHabit = (dateStr: string, habitId: string) => {
    if (dateStr > todayStr) return;
    setTrackerData(prev => {
      const day = prev[dateStr];
      const newHabits = { ...day.habits, [habitId]: !day.habits[habitId] };
      const newDay = { ...day, habits: newHabits };
      
      if (selectedDayObj?.date === dateStr) setSelectedDayObj(newDay)
      return { ...prev, [dateStr]: newDay }
    })
  }

  const updateField = (dateStr: string, field: 'mood'|'notes', value: string) => {
    if (dateStr > todayStr) return;
    setTrackerData(prev => {
      const newDay = { ...prev[dateStr], [field]: value }
      if (selectedDayObj?.date === dateStr) setSelectedDayObj(newDay)
      return { ...prev, [dateStr]: newDay }
    })
  }

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    const newId = newHabitName.toLowerCase().replace(/\s/g, '-') + '-' + Date.now();
    const newHabit: Habit = { id: newId, name: newHabitName };
    newHabit.startDate = startDate || todayStr;
    if (endDate) newHabit.endDate = endDate;
    
    setHabitsList(prev => [...prev, newHabit])
    setNewHabitName('')
    setStartDate('')
    setEndDate('')
  }

  const deleteHabit = (habitId: string) => {
    if (window.confirm('Are you sure you want to delete this habit and all its history?')) {
      setHabitsList(prev => prev.filter(h => h.id !== habitId))
      // Option: clean trackerData of this habit
      setTrackerData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(date => {
          if (newData[date].habits[habitId] !== undefined) {
             delete newData[date].habits[habitId];
          }
        });
        return newData;
      });
    }
  }

  const calculateConsistency = () => {
    let checkedCount = 0
    let possibleCount = 0

    Object.values(trackerData).forEach(day => {
      if (day.date <= todayStr) {
        habitsList.forEach(h => {
          if (isHabitActiveOnDate(h, day.date)) {
            possibleCount++
            if (day.habits[h.id]) checkedCount++
          }
        })
      }
    })

    if (possibleCount === 0) return { score: 0, text: "0/0" }
    return {
      score: Math.round((checkedCount / possibleCount) * 100),
      text: `${checkedCount}/${possibleCount}`
    }
  }

  const calculateStreaks = () => {
    // Cumulative Streak Model
    // S(d) = sum(x(i)) / (d * n)
    const pastDays = Object.values(trackerData)
      .filter(d => d.date <= todayStr);

    let overallChecked = 0;
    let overallPossible = 0;
    const indChecked: Record<string, number> = {};
    const indPossible: Record<string, number> = {};

    habitsList.forEach(h => {
      indChecked[h.id] = 0;
      indPossible[h.id] = 0;
    });

    for (let day of pastDays) {
      habitsList.forEach(h => {
        if (isHabitActiveOnDate(h, day.date)) {
          overallPossible++;
          indPossible[h.id]++;
          if (day.habits[h.id]) {
            overallChecked++;
            indChecked[h.id]++;
          }
        }
      });
    }

    const overallStreak = overallPossible === 0 ? "0.00" : (overallChecked / overallPossible).toFixed(2);

    const streaks: Record<string, string> = {};
    habitsList.forEach(h => {
      streaks[h.id] = indPossible[h.id] === 0 ? "0.00" : (indChecked[h.id] / indPossible[h.id]).toFixed(2);
    });

    return { overall: overallStreak, individual: streaks };
  }

  const getDayStatusColor = (day: DayData) => {
    let active = 0;
    let checked = 0;
    habitsList.forEach(h => { 
      if (isHabitActiveOnDate(h, day.date)) {
        active++;
        if (day.habits[h.id]) checked++;
      }
    })
    
    if (active === 0) return 'transparent';
    if (checked === active) return 'var(--success)';
    if (checked > 0) return 'var(--warning)';
    if (day.date < todayStr) return 'var(--danger)';
    return 'transparent';
  }

  const activeDates = Object.values(trackerData).filter(day => {
    const d = new Date(day.date)
    return ALL_MONTHS[d.getMonth()] === activeMonth
  }).sort((a,b) => a.date.localeCompare(b.date))

  const consistency = calculateConsistency()
  const streaksData = calculateStreaks()

  return (
    <div className="container">
      <header className="header">
        <h1>🚀 2026 Discipline Challenge</h1>
        <p>Your beautiful personal tracker. Click on any day to edit your info.</p>
      </header>

      {/* STREAKS SECTION */}
      <div className="stats-section glass-panel">
         <h2>🔥 Current Streaks</h2>
         <div className="streaks-grid">
           <div className="streak-card highlight">
             <div className="streak-value">{streaksData.overall}</div>
             <div className="streak-label">Cumulative Score (S)</div>
           </div>
           {habitsList.map(h => (
             <div className="streak-card" key={`streak-${h.id}`}>
               <div className="streak-value">{streaksData.individual[h.id]}</div>
               <div className="streak-label">{h.name}</div>
             </div>
           ))}
         </div>
      </div>

      <div className="glass-panel">
        <div className="summary-grid" style={{marginBottom: '2rem'}}>
          <div className="stat-card">
            <div className="stat-value">{consistency.score}%</div>
            <div className="stat-label">Overall Consistency ({consistency.text})</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{habitsList.length}</div>
            <div className="stat-label">Active Habits</div>
          </div>
        </div>

        {/* HABIT MANAGEMENT */}
        <div className="habit-management">
          <h3>Add New Habit</h3>
          <form className="habit-form" onSubmit={addHabit}>
            <input 
              type="text" 
              placeholder="Task/Habit name..." 
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              className="modern-input flex-grow"
              required
            />
            <div className="date-inputs">
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={e=>setStartDate(e.target.value)} 
                 className="modern-input date-input"
                 title="Start Date (Optional)"
               />
               <span style={{color: 'var(--text-secondary)'}}>to</span>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={e=>setEndDate(e.target.value)}
                 className="modern-input date-input"
                 title="End Date (Optional)"
               />
            </div>
            <button type="submit" className="btn active">+ Add</button>
          </form>

          <div className="managed-habits-list">
             {habitsList.map(h => (
               <div className="managed-habit-item" key={`manage-${h.id}`}>
                 <div className="managed-habit-info">
                   <span className="managed-name">{h.name}</span>
                   {(h.startDate || h.endDate) && (
                     <span className="managed-dates">
                       ({h.startDate || 'Start'} ➡️ {h.endDate || 'Ongoing'})
                     </span>
                   )}
                 </div>
                 <button className="del-btn" onClick={() => deleteHabit(h.id)}>🗑️</button>
               </div>
             ))}
          </div>
        </div>

        <div className="controls" style={{ gap: '2rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <div className="month-selector" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="btn" 
              onClick={() => {
                const idx = ALL_MONTHS.indexOf(activeMonth);
                if (idx > 0) setActiveMonth(ALL_MONTHS[idx - 1]);
              }} 
              disabled={activeMonth === 'January'}
            >
              &larr; Prev
            </button>
            <h2 style={{ minWidth: '150px', textAlign: 'center', margin: 0 }}>{activeMonth}</h2>
            <button 
              className="btn" 
              onClick={() => {
                const idx = ALL_MONTHS.indexOf(activeMonth);
                if (idx < ALL_MONTHS.length - 1) setActiveMonth(ALL_MONTHS[idx + 1]);
              }} 
              disabled={activeMonth === 'December'}
            >
              Next &rarr;
            </button>
          </div>
          <button 
            className="btn" 
            style={{ fontWeight: 'bold' }}
            onClick={() => {
              if (window.confirm('Are you absolutely sure you want to reset all your habits and data?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
          >
            Reset Tracker
          </button>
        </div>

        {/* CALENDAR VIEW */}
        <div className="calendar-grid">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {activeDates.length > 0 && Array.from({length: new Date(activeDates[0].date).getDay()}).map((_, i) => (
             <div key={`empty-${i}`} className="calendar-box empty"></div>
          ))}
          {activeDates.map(day => {
            const dateObj = new Date(day.date)
            const isToday = day.date === todayStr
            const isFuture = day.date > todayStr
            return (
              <div 
                key={day.date} 
                className={`calendar-box ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}`}
                title={isToday ? "Click to edit tasks for today!" : "View day details"}
                onClick={() => setSelectedDayObj(day)}
              >
                <div className="calendar-date-number">{dateObj.getDate()}</div>
                <div 
                  className="calendar-indicator"
                  style={{ backgroundColor: getDayStatusColor(day) }}
                ></div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL VIEW */}
      {selectedDayObj && (() => {
        // Filter habits that are active for the selected date
        const activeHabitsOnDay = habitsList.filter(h => isHabitActiveOnDate(h, selectedDayObj.date));
        const isFuture = selectedDayObj.date > todayStr;
        
        return (
        <div className="modal-overlay" onClick={() => setSelectedDayObj(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedDayObj(null)}>x</button>
            <h2>{new Date(selectedDayObj.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
            
            {isFuture && <p className="restricted-msg" style={{color: 'var(--warning)'}}>Future dates cannot be edited yet!</p>}

            <div className="modal-habits">
              {activeHabitsOnDay.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No active habits for this date.</p>}
              {activeHabitsOnDay.map(habit => (
                <div key={habit.id} className={`modal-habit-row ${isFuture ? 'disabled' : ''}`}>
                  <label className="checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      checked={selectedDayObj.habits[habit.id] || false}
                      onChange={() => toggleHabit(selectedDayObj.date, habit.id)}
                      disabled={isFuture}
                    />
                    <span className="checkmark">{selectedDayObj.habits[habit.id] ? '✓' : ''}</span>
                    <span className="habit-name">{habit.name}</span>
                  </label>
                </div>
              ))}
            </div>

            <div className="modal-extras">
               <div className="modal-extra-item">
                 <label>Mood 😊: </label>
                 <select 
                   className="mood-select"
                   value={selectedDayObj.mood} 
                   onChange={e => updateField(selectedDayObj.date, 'mood', e.target.value)}
                   disabled={isFuture}
                 >
                   <option value="-">-</option>
                   <option value="10/10">10/10</option>
                   <option value="8/10">8/10</option>
                   <option value="6/10">6/10</option>
                   <option value="4/10">4/10</option>
                 </select>
               </div>
               <div className="modal-extra-item line">
                 <label>Notes 📝: </label>
                 <input 
                   type="text" 
                   className="notes-input" 
                   value={selectedDayObj.notes}
                   onChange={e => updateField(selectedDayObj.date, 'notes', e.target.value)}
                   placeholder="How did the day go?"
                   disabled={isFuture}
                 />
               </div>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}

export default App
