const getDatePart = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

export const getEventDayCount = (event) => {
  const start = getDatePart(event?.startDate);
  const end = getDatePart(event?.endDate) || start;

  if (start && end) {
    const startMs = Date.parse(`${start}T00:00:00Z`);
    const endMs = Date.parse(`${end}T00:00:00Z`);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      return Math.floor((endMs - startMs) / 86400000) + 1;
    }
  }

  const scheduledDays = (event?.schedule || []).reduce((max, item) => {
    const match = String(item?.day || '').match(/day\s*(\d+)/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return Math.max(1, Number(event?.durationDays) || Number(event?.days) || scheduledDays || 1);
};

export const getEventDayLabel = (event, dayNumber) => {
  const start = getDatePart(event?.startDate);
  if (start) {
    const date = new Date(`${start}T00:00:00`);
    date.setDate(date.getDate() + dayNumber - 1);
    const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `Day ${dayNumber} · ${formatted}`;
  }
  return `Day ${dayNumber}`;
};
