import { useApp } from '../context/AppContext';
import ChatView from './ChatView';

export default function GlobalChat() {
  const { actingUser, globalMessages, sendGlobalMessage } = useApp();

  return (
    <ChatView
      messages={globalMessages}
      onSend={sendGlobalMessage}
      actingUserName={actingUser.name}
      title="League Chat"
      subtitle={`${globalMessages.length} message${globalMessages.length !== 1 ? 's' : ''} · everyone`}
      placeholder="Message the league…"
    />
  );
}
