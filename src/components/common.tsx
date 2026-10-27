import type { Book } from "../types";
import { date, money } from "../lib/format";

export function Metric({ label, value, foot, icon, tone = "" }: { label: string; value: string | number; foot: string; icon: string; tone?: string }) {
  return <section className="metric-card"><div className="metric-top"><span>{label}</span><i className={`metric-icon ${tone}`}>{icon}</i></div><strong>{value}</strong><small>{foot}</small></section>;
}

export function Status({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase().replace(" ", "-")}`}><i />{status}</span>;
}

export function Priority({ priority }: { priority: string }) {
  return <span className={`priority-badge priority-text-${priority.toLowerCase()}`}>{priority}</span>;
}

export function BookCard({ book, index }: { book: Book; index: number }) {
  const palettes = ["sage", "peach", "blue", "lavender"];
  return <article className="book-card">
    <div className={`book-cover ${palettes[index % palettes.length]}`}>
      <div className="cover-label">BOOKLEAF<br /><i>EDITION</i></div>
      <div className="cover-title">{book.title}</div>
      <div className="cover-rule" />
      <div className="cover-author">A BOOK BY<br />AUTHOR</div>
      <div className="cover-stem">✳</div>
    </div>
    <div className="book-info">
      <div className="book-title-line"><h3>{book.title}</h3><Status status={book.status === "Published & Live" ? "Published" : "In Production"} /></div>
      <p className="book-genre">{book.genre} <span>·</span> ISBN {book.isbn}</p>
      <div className="book-stats">
        <div><small>COPIES SOLD</small><b>{book.total_copies_sold.toLocaleString("en-IN")}</b></div>
        <div><small>ROYALTY EARNED</small><b>{money(book.total_royalty_earned)}</b></div>
      </div>
      <div className="book-foot">
        <span>MRP {book.mrp == null ? "—" : money(book.mrp)}</span>
        <span>Paid {money(book.royalty_paid)}</span>
        <span>Pending {money(book.royalty_pending)}</span>
        <span>Published {date(book.publication_date)}</span>
      </div>
    </div>
  </article>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span>✳</span><h3>{title}</h3><p>{detail}</p></div>;
}

export function PageHeading({ eyebrow, title, detail, liveText }: { eyebrow: string; title: React.ReactNode; detail: string; liveText: string }) {
  return <div className="page-heading">
    <div><p className="eyebrow">{eyebrow}</p><h1>{title}<span className="heading-period">.</span></h1><p>{detail}</p></div>
    <div className="live-pill"><span className="green-dot" /> {liveText}</div>
  </div>;
}
