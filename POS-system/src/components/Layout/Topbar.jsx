import React from 'react';
import { FiClock } from 'react-icons/fi';

export default function Topbar({ title }) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = time.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <header className="topbar">
      <h2 className="topbar-title">{title}</h2>
      <div className="topbar-actions">
        <div className="topbar-time">
          <FiClock style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {formattedDate} — {formattedTime}
        </div>
      </div>
    </header>
  );
}
