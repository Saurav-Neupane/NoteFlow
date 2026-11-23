/** Convert a wall-clock datetime-local value in an IANA zone to an absolute instant. */
export function localDateTimeToUtc(value: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('Enter a valid local date and time.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  // Iterate the zone offset until the formatted wall time matches the input.
  let instant = target;
  for (let i = 0; i < 4; i += 1) {
    const values = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
    const delta = target - represented;
    instant += delta;
    if (delta === 0) break;
  }
  const result = new Date(instant);
  const finalParts = Object.fromEntries(formatter.formatToParts(result).map((part) => [part.type, part.value]));
  if (Number(finalParts.year) !== year || Number(finalParts.month) !== month || Number(finalParts.day) !== day || Number(finalParts.hour) !== hour || Number(finalParts.minute) !== minute) {
    throw new Error('That local time does not exist in the selected timezone.');
  }
  return result;
}
