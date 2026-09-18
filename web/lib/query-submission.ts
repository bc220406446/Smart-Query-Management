/** Normalize messages received from channels that may include a subject prefix. */
export function splitIncomingQuery(subject: string | undefined, body: string) {
  const text = body.trim();
  const structured = text.match(/^\s*subject\s*:\s*(.+?)\s*(?:detail|description|message)\s*:\s*([\s\S]+)$/i);

  if (structured) {
    return { subject: structured[1].trim().slice(0, 200), message: structured[2].trim().slice(0, 5000) };
  }

  return {
    subject: (subject?.trim() || text.split(/\r?\n/, 1)[0] || "WhatsApp message").slice(0, 200),
    message: text.slice(0, 5000),
  };
}
