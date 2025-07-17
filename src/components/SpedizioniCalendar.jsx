import { useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

export default function SpedizioniCalendar({ spedizioni }) {
  // Prepara eventi per il calendario
  const events = spedizioni.map(s => {
    const start = s.dataPianificata ? new Date(s.dataPianificata) : null;
    const end = start ? new Date(start.getTime() + 60 * 60 * 1000) : null;
    // Colore: arancione se da pianificare, blu se pianificata
    const color = s.daPianificare === true ? "#f59e42" : "#2563eb";
    return {
      id: s.id,
      title: `${s.aziendaDestinazione || ""} (${s.tipo})`,
      start,
      end,
      resource: s,
      color
    };
  });

  return (
    <div className="bg-white rounded shadow p-6 mt-8">
      <h2 className="text-xl font-bold mb-4">Calendario Spedizioni</h2>
      <Calendar
        localizer={localizer}
        events={events}
        defaultView="week"
        views={["week"]}
        step={60}
        timeslots={1}
        style={{ height: 600 }}
        messages={{ week: "Settimana" }}
        min={new Date(1970, 1, 1, 7, 0)}
        max={new Date(1970, 1, 1, 19, 0)}
        eventPropGetter={event => ({ style: { backgroundColor: event.color, color: "white", borderRadius: "6px", border: "none" } })}
        tooltipAccessor={event => event.title}
        onSelectEvent={event => {
          if (event && event.id) {
            window.location.href = `/spedizioni/${event.id}`;
          }
        }}
      />
    </div>
  );
}
