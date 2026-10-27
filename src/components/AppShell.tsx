import type { ReactNode } from "react";
import type { User } from "../types";

type AppShellProps = {
  user: User;
  page: string;
  ticketCount: number;
  children: ReactNode;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
  onRefresh: () => void;
};

export function AppShell({ user, page, ticketCount, children, onNavigate, onSignOut, onRefresh }: AppShellProps) {
  const isAdmin = user.role === "admin";
  const navItems = isAdmin ? ["Queue"] : ["Overview", "My books", "My tickets", "New ticket"];
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><div className="brand-mark small">b<span>.</span></div><div>bookleaf<small>AUTHOR SUPPORT</small></div></div>
      <div className="workspace-label">{isAdmin ? "WORKSPACE" : "YOUR SPACE"}</div>
      <nav>{navItems.map((item, index) => <button key={item} className={`nav-item ${page === item ? "active" : ""}`} onClick={() => onNavigate(item)}>
        <span className="nav-icon">{isAdmin ? "▤" : ["⌂", "▧", "◷", "+"][index]}</span>{item}
        {item === "My tickets" && ticketCount > 0 && <span className="nav-count">{ticketCount}</span>}
      </button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><span className="help-icon">✳</span><b>Here to help</b><p>Our team is always just a message away.</p>{!isAdmin && <button onClick={() => onNavigate("New ticket")}>Get support <span>→</span></button>}</div>
        <div className="user-row"><div className="avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="user-ident"><b>{user.name}</b><small>{isAdmin ? "Operations team" : "Author account"}</small></div><button className="signout" title="Sign out" onClick={onSignOut}>↗</button></div>
      </div>
    </aside>
    <main className="main-panel">
      <header className="topbar">
        <div><span className="breadcrumb">Workspace</span><span className="crumb-divider">/</span><b>{page}</b></div>
        <div className="topbar-actions"><span className="secure-label"><span className="green-dot" /> Secure portal</span><button className="icon-button" title="Refresh" onClick={onRefresh}>↻</button><button className="icon-button" title="Sign out" onClick={onSignOut}>↗</button></div>
      </header>
      <div className="content">{children}</div>
      <footer className="footer"><span>BookLeaf Publishing <i>·</i> Made for the stories you tell</span><span>Need help? We’re right here.</span></footer>
    </main>
  </div>;
}
