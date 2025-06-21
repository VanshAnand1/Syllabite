import React, { useState, useMemo } from "react";

function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function CalendarOverview({ schedule }) {
  // Use fallback dates first — override in useEffect or memo if needed
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth();

  const [currentYear, setCurrentYear] = useState(defaultYear);
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [selectedDate, setSelectedDate] = useState(null);

  // Guard: render placeholder if no schedule
  const hasEvents = Array.isArray(schedule) && schedule.length > 0;
  const dates = hasEvents ? schedule.map(ev => new Date(ev.start)) : [];
  const earliestDate = hasEvents ? new Date(Math.min(...dates)) : now;
  const latestDate = hasEvents ? new Date(Math.max(...dates)) : now;

  const canGoPrev =
    currentYear > earliestDate.getFullYear() ||
    (currentYear === earliestDate.getFullYear() && currentMonth > earliestDate.getMonth());

  const canGoNext =
    currentYear < latestDate.getFullYear() ||
    (currentYear === latestDate.getFullYear() && currentMonth < latestDate.getMonth());

  const prevMonth = () => {
    let year = currentYear;
    let month = currentMonth - 1;
    if (month < 0) {
      month = 11;
      year--;
    }
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const nextMonth = () => {
    let year = currentYear;
    let month = currentMonth + 1;
    if (month > 11) {
      month = 0;
      year++;
    }
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);

  const eventsByDay = useMemo(() => {
    const map = {};
    if (!hasEvents) return map;

    schedule.forEach((ev) => {
      const d = new Date(ev.start);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const dayStr = d.toISOString().slice(0, 10);
        if (!map[dayStr]) map[dayStr] = [];
        map[dayStr].push(ev);
      }
    });

    return map;
  }, [schedule, currentYear, currentMonth, hasEvents]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (!hasEvents) {
    return <p>No events to display.</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={prevMonth} disabled={!canGoPrev}>← Previous</button>
        <h3>
          Events for {new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} {currentYear}
        </h3>
        <button onClick={nextMonth} disabled={!canGoNext}>Next →</button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        fontWeight: "bold",
        marginBottom: 8,
        textAlign: "center",
      }}>
        {dayNames.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 8,
        backgroundColor: "#fafafa",
      }}>
        {[...Array(daysInMonth[0].getDay())].map((_, i) => <div key={`empty-${i}`} />)}

        {daysInMonth.map((date) => {
          const dayStr = date.toISOString().slice(0, 10);
          const isSelected = selectedDate === dayStr;
          const events = eventsByDay[dayStr] || [];

          return (
            <div
              key={dayStr}
              onClick={() => setSelectedDate(isSelected ? null : dayStr)}
              style={{
                padding: 8,
                borderRadius: 8,
                cursor: "pointer",
                backgroundColor: isSelected ? "#4f46e5" : "transparent",
                color: isSelected ? "white" : "black",
                position: "relative",
                border: events.length ? "2px solid #4f46e5" : "1px solid transparent",
              }}
              title={`${date.getDate()} - ${events.length} event${events.length !== 1 ? "s" : ""}`}
            >
              {date.getDate()}
              <div style={{
                position: "absolute",
                bottom: 4,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 2,
                justifyContent: "center",
              }}>
                {events.slice(0, 3).map((_, i) => (
                  <span key={i} style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "white",
                    border: "1.5px solid #4f46e5",
                  }} />
                ))}
                {events.length > 3 && (
                  <span style={{
                    fontSize: 10,
                    color: isSelected ? "white" : "#4f46e5",
                    marginLeft: 2,
                  }}>
                    +
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && eventsByDay[selectedDate] && (
        <div style={{
          marginTop: 12,
          backgroundColor: "#e0e7ff",
          padding: 12,
          borderRadius: 8,
          maxHeight: 200,
          overflowY: "auto",
        }}>
          <h4>Events on {selectedDate}</h4>
          <ul style={{ paddingLeft: 20 }}>
            {eventsByDay[selectedDate].map((ev, i) => (
              <li key={i}>
                <strong>{ev.title || ev.eventName}</strong> —{" "}
                {new Date(ev.start || ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} to{" "}
                {new Date(ev.end || ev.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
