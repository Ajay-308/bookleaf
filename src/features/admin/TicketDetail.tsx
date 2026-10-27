import { date } from "../../lib/format";
import type { Ticket } from "../../types";
import { categories, priorities, statuses } from "../../types";
import { Priority, Status } from "../../components/common";

type TicketDetailProps = {
  ticket: Ticket;
  draft: string;
  reply: string;
  note: string;
  busy: boolean;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onReplyChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onStatus: (value: string) => void;
  onCategory: (value: string) => void;
  onPriority: (value: string) => void;
  onAssign: () => void;
  onDraft: () => void;
  onSend: () => void;
  onNote: () => void;
};

export function TicketDetail({ ticket, draft, reply, note, busy, onClose, onDraftChange, onReplyChange, onNoteChange, onStatus, onCategory, onPriority, onAssign, onDraft, onSend, onNote }: TicketDetailProps) {
  return <div className="detail-overlay" onClick={onClose}><section className="detail-drawer" onClick={(event) => event.stopPropagation()}>
    <div className="drawer-header"><span className="eyebrow">TICKET · {ticket.id.slice(0, 8).toUpperCase()}</span><button className="icon-button" onClick={onClose}>×</button></div>
    <div className="drawer-scroll">
      <div className="drawer-title"><h2>{ticket.subject}</h2><div><Priority priority={ticket.priority} /><Status status={ticket.status} /></div></div>
      {ticket.ai_error && <div className="ai-fallback-notice">AI classification was unavailable when this ticket arrived. The category and priority below use local rules; please verify them.</div>}
      <div className="author-identity"><div className="avatar">{ticket.author.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><span><b>{ticket.author.name}</b><small>{ticket.author.email}</small></span></div>
      <div className="detail-meta"><div><small>BOOK</small><b>{ticket.book?.title || "General / Account Level"}</b></div><div><small>RECEIVED</small><b>{date(ticket.created_at)}</b></div></div>
      <div className="original-query"><span className="eyebrow">AUTHOR’S MESSAGE</span><p>{ticket.description}</p></div>
      <div className="admin-controls">
        <label>STATUS<select value={ticket.status} onChange={(event) => onStatus(event.target.value)}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>PRIORITY<select value={ticket.priority} onChange={(event) => onPriority(event.target.value)}>{priorities.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="wide-control">CATEGORY<select value={ticket.category} onChange={(event) => onCategory(event.target.value)}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <button className="assign-button" onClick={onAssign}>↗ Assign this ticket to me</button>
      <div className="response-heading"><div><h3>Response to author</h3><p>Review before sending. Only you can see this draft.</p></div><button className="button outline compact" onClick={onDraft} disabled={busy}>✳ {busy ? "Thinking…" : "Generate draft"}</button></div>
      {draft && <label className="draft-label">AI SUGGESTION<textarea rows={5} value={draft} onChange={(event) => onDraftChange(event.target.value)} /></label>}
      <textarea className="reply-box" rows={draft ? 4 : 6} placeholder="Write a thoughtful reply to the author…" value={reply || draft} onChange={(event) => { onReplyChange(event.target.value); if (draft) onDraftChange(""); }} />
      <button className="button primary full" onClick={onSend} disabled={!(reply || draft).trim()}>Send response <span>→</span></button>
      <div className="internal-section"><label>INTERNAL NOTE <textarea rows={3} placeholder="Add context for your team. The author won't see this." value={note} onChange={(event) => onNoteChange(event.target.value)} /></label><button className="button outline full" onClick={onNote} disabled={!note.trim()}>Save internal note</button></div>
      {ticket.messages.length > 0 && <div className="history"><h3>Conversation history</h3>{ticket.messages.map((message) => <article key={message.id} className={`history-message ${message.visibility === "internal" ? "internal" : ""}`}><small>{message.visibility === "internal" ? "INTERNAL NOTE" : message.sender_name} · {date(message.created_at)}</small><p>{message.body}</p></article>)}</div>}
    </div>
  </section></div>;
}
