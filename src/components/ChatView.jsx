import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import EmptyState from './EmptyState';
import { formatMessageTime } from '../mockData';

export default function ChatView({
  messages,
  onSend,
  actingUserName,
  title = 'Chat',
  subtitle,
  placeholder = 'Type a message…',
  onBack,
  compact = false,
  onTitleClick,
  titleMenuOpen = false,
  titleMenu,
}) {
  const [chatInput, setChatInput] = useState('');

  function handleSend(e) {
    e.preventDefault();
    onSend(chatInput);
    setChatInput('');
  }

  const messageList = (
    <div
      className={
        compact
          ? 'max-h-56 space-y-2 overflow-y-auto overscroll-contain rounded-xl border border-slate-700/50 bg-slate-900/40 p-2'
          : 'space-y-3 pb-2'
      }
    >
      {messages.length === 0 ? (
        compact ? (
          <p className="py-6 text-center text-xs text-slate-500">No messages yet — say hello!</p>
        ) : (
          <EmptyState
            icon="💬"
            title="No messages yet"
            description="Be the first to start the conversation."
          />
        )
      ) : (
        messages.map((msg) => {
          const isMe = msg.sender_name === actingUserName;
          const isAlert = msg.text.startsWith('⚠️');
          return (
            <div
              key={msg.id}
              className={`animate-fade-in flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 transition-all duration-300 ${
                  isAlert
                    ? 'border border-red-500/40 bg-red-950/60 text-red-100'
                    : isMe
                      ? 'bg-emerald-600 text-emerald-950 shadow-md shadow-emerald-900/20'
                      : 'bg-slate-800 text-slate-100 hover:bg-slate-700/80'
                }`}
              >
                {!isMe && (
                  <p className="mb-0.5 text-[10px] font-bold opacity-70">{msg.sender_name}</p>
                )}
                <p className="text-sm leading-snug">{msg.text}</p>
                <p className={`mt-1 text-[10px] ${isMe ? 'text-emerald-900/60' : 'text-slate-500'}`}>
                  {formatMessageTime(msg.timestamp)}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        {messageList}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={placeholder}
            className="input-interactive min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="btn-interactive shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col animate-tab-in">
      <div className="relative shrink-0 border-b border-emerald-900/30 px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="btn-interactive flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 text-sm text-slate-300 hover:border-emerald-600/40 hover:text-white"
              aria-label="Back"
            >
              ←
            </button>
          )}
          <div className="relative min-w-0 flex-1">
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                className="btn-interactive flex max-w-full items-center gap-1.5 text-left"
                aria-expanded={titleMenuOpen}
              >
                <h2 className="truncate text-lg font-bold text-white">{title}</h2>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-emerald-400 transition-transform duration-200 ${
                    titleMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <h2 className="text-lg font-bold text-white">{title}</h2>
            )}
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>

        {titleMenuOpen && titleMenu && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Close menu"
              onClick={onTitleClick}
            />
            <div className="absolute left-4 right-4 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-700/80 bg-slate-900 shadow-xl shadow-black/40">
              {titleMenu}
            </div>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {messageList}
      </div>

      <form
        onSubmit={handleSend}
        className="safe-bottom shrink-0 border-t border-slate-700/50 bg-slate-900/95 px-4 py-3 backdrop-blur-sm"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={placeholder}
            className="input-interactive min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="btn-interactive shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
