import { EmptyState, Metric, PageHeading, Priority, Status } from "../../components/common";
import { date } from "../../lib/format";
import type { QueueFilters, Ticket } from "../../types";
import { categories, priorities, statuses } from "../../types";
import { TicketDetail } from "./TicketDetail";

type AdminQueueProps = {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  filters: QueueFilters;
  draft: string;
  reply: string;
  note: string;
  busy: boolean;
  onFiltersChange: (filters: QueueFilters) => void;
  onSelectTicket: (ticket: Ticket | null) => void;
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

export function AdminQueue(props: AdminQueueProps) {
  const { tickets, selectedTicket, filters, draft, reply, note, busy, onFiltersChange, onSelectTicket } = props;
  const open = tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status)).length;
  const urgent = tickets.filter((ticket) => ["Critical", "High"].includes(ticket.priority) && !["Resolved", "Closed"].includes(ticket.status)).length;
  const resolved = tickets.filter((ticket) => ticket.status === "Resolved").length;
  const changeFilter = (key: keyof QueueFilters, value: string) => onFiltersChange({ ...filters, [key]: value });

  return <>
    <PageHeading eyebrow="AUTHOR CARE · OPERATIONS" title="Support queue" detail="Every conversation, handled with care." liveText="Live updates · 8 sec" />
    <div className="metric-grid admin-metrics">
      <Metric label="NEEDS ATTENTION" value={open} foot={`${urgent} high priority`} icon="◷" />
      <Metric label="HIGH PRIORITY" value={urgent} foot="Open or in progress" icon="!" tone="warm" />
      <Metric label="RESOLVED" value={resolved} foot="Tickets completed" icon="✓" tone="green" />
      <Metric label="ALL TICKETS" value={tickets.length} foot="Across all authors" icon="▤" />
    </div>
    <section className="panel queue-panel">
      <div className="panel-header queue-header"><div><h2>All conversations</h2><p>Prioritised by urgency and time waiting</p></div><span className="result-count">{tickets.length} tickets</span></div>
      <div className="filters">
        <input className="search-input" placeholder="Search author or subject…" value={filters.q} onChange={(event) => changeFilter("q", event.target.value)} />
        <select value={filters.status} onChange={(event) => changeFilter("status", event.target.value)}><option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={filters.category} onChange={(event) => changeFilter("category", event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={filters.priority} onChange={(event) => changeFilter("priority", event.target.value)}><option value="">All priorities</option>{priorities.map((value) => <option key={value}>{value}</option>)}</select>
        <label className="date-filter">From<input type="date" value={filters.from} onChange={(event) => changeFilter("from", event.target.value)} /></label>
        <label className="date-filter">To<input type="date" value={filters.to} onChange={(event) => changeFilter("to", event.target.value)} /></label>
      </div>
      {tickets.length === 0 ? <EmptyState title="A clear queue" detail="No tickets match these filters. Your authors are all caught up." /> : <div className="ticket-list">
        {tickets.map((ticket) => <button key={ticket.id} className={`queue-row ${selectedTicket?.id === ticket.id ? "selected" : ""}`} onClick={() => onSelectTicket(ticket)}>
          <div className={`priority-dot priority-${ticket.priority.toLowerCase()}`} />
          <div className="queue-main"><div className="queue-title-line"><b>{ticket.subject}</b><Priority priority={ticket.priority} /></div><div className="queue-subline"><span>{ticket.author.name}</span><span>·</span><span>{ticket.book?.title || "General enquiry"}</span></div></div>
          <div className="queue-right"><Status status={ticket.status} /><small>{date(ticket.created_at)}</small></div><span className="row-arrow">→</span>
        </button>)}
      </div>}
    </section>
    {selectedTicket && <TicketDetail
      ticket={selectedTicket} draft={draft} reply={reply} note={note} busy={busy}
      onClose={() => onSelectTicket(null)} onDraftChange={props.onDraftChange}
      onReplyChange={props.onReplyChange} onNoteChange={props.onNoteChange}
      onStatus={props.onStatus} onCategory={props.onCategory} onPriority={props.onPriority}
      onAssign={props.onAssign} onDraft={props.onDraft} onSend={props.onSend} onNote={props.onNote}
    />}
  </>;
}
