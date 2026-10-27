import { AdminQueue } from "./features/admin/AdminQueue";
import { AuthorPages } from "./features/author/AuthorPages";
import { AppShell } from "./components/AppShell";
import { LoginScreen } from "./components/LoginScreen";
import { usePortal } from "./hooks/usePortal";

function App() {
  const portal = usePortal();

  if (!portal.user) {
    return <LoginScreen busy={portal.busy} error={portal.loginError} onLogin={portal.logIn} />;
  }

  const isAdmin = portal.user.role === "admin";
  return <AppShell
    user={portal.user}
    page={portal.page}
    ticketCount={portal.tickets.length}
    onNavigate={(page) => { portal.setPage(page); portal.setSelectedTicket(null); }}
    onSignOut={portal.signOut}
    onRefresh={() => void portal.loadPortal(portal.user!)}
  >
    {portal.notice && <div className="notice"><span>✳</span>{portal.notice}<button onClick={() => portal.setNotice("")}>×</button></div>}
    {isAdmin ? <AdminQueue
      tickets={portal.tickets}
      selectedTicket={portal.selectedTicket}
      filters={portal.filters}
      draft={portal.draft}
      reply={portal.reply}
      note={portal.internalNote}
      busy={portal.busy}
      onFiltersChange={portal.setFilters}
      onSelectTicket={(ticket) => {
        if (portal.selectedTicket?.id !== ticket?.id) portal.setDraft("");
        portal.setSelectedTicket(ticket);
      }}
      onDraftChange={portal.setDraft}
      onReplyChange={portal.setReply}
      onNoteChange={portal.setInternalNote}
      onStatus={(status) => void portal.updateTicket({ status })}
      onCategory={(category) => void portal.updateTicket({ category })}
      onPriority={(priority) => void portal.updateTicket({ priority })}
      onAssign={() => void portal.updateTicket({ assignToMe: true })}
      onDraft={() => void portal.generateDraft()}
      onSend={() => void portal.sendMessage(portal.reply || portal.draft, "public")}
      onNote={() => void portal.sendMessage(portal.internalNote, "internal")}
    /> : <AuthorPages
      page={portal.page}
      user={portal.user}
      books={portal.books}
      tickets={portal.tickets}
      selectedTicket={portal.selectedTicket}
      draft={portal.newTicket}
      search={portal.search}
      busy={portal.busy}
      onSearch={portal.setSearch}
      onDraftChange={portal.setNewTicket}
      onSelectTicket={portal.setSelectedTicket}
      onNavigate={portal.setPage}
      onSubmitTicket={(event) => void portal.submitTicket(event)}
    />}
  </AppShell>;
}

export default App;
