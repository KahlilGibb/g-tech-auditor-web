/** Use the server's dealer/date/time filename, without allowing path segments. */
export function reportFilename(disposition: string, fallback: string): string {
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quoted = disposition.match(/filename="([^"]+)"/i)?.[1];
  const plain = disposition.match(/filename=([^;]+)/i)?.[1];
  let name = quoted || plain || fallback;
  if (encoded) { try { name = decodeURIComponent(encoded); } catch { /* safe fallback */ } }
  name = Array.from(name, char => char.charCodeAt(0) < 32 ? '-' : char).join('');
  name = name.replace(/[\\/:*?"<>|]/g, '-').replace(/^\.+/, '').trim();
  return `${name.replace(/\.xlsx$/i, '').slice(0, 180).trim() || 'Inspection Report'}.xlsx`;
}
