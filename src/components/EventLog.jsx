export default function EventLog({ events, onClear }) {
  return (
    <div className="panel glass-panel">
      <div className="panel-title-row">
        <h3>Event Log</h3>
        <button className="clear-button" onClick={onClear}>Clear Log</button>
      </div>

      <div className="event-list">
        {events.map((event) => (
          <div key={event.id} className="event-item">
            <span className="event-time">{event.time}</span>
            <span className={`event-type ${event.type.toLowerCase()}`}>{event.type}</span>
            <span className="event-message">{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
