import { useState } from 'react';
import { useApp } from '../context/AppContext';
import ChatView from './ChatView';

export default function ClubChat({ team, onBack }) {
  const { actingUser, clubMembers, clubMessages, sendClubMessage } = useApp();
  const [teammatesOpen, setTeammatesOpen] = useState(false);

  const teammatesMenu = (
    <>
      <p className="border-b border-slate-700/60 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Teammates ({clubMembers.length})
      </p>
      {clubMembers.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-slate-500">No teammates yet</p>
      ) : (
        <ul className="py-1">
          {clubMembers.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-slate-800/80"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {member.name}
                  {member.id === actingUser.id && (
                    <span className="ml-1 text-[10px] font-normal text-emerald-400">(you)</span>
                  )}
                </p>
                <p className="truncate text-[10px] text-slate-500">{member.email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
                {member.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <ChatView
      messages={clubMessages}
      onSend={sendClubMessage}
      actingUserName={actingUser.name}
      title={team.name}
      subtitle={`${clubMessages.length} message${clubMessages.length !== 1 ? 's' : ''} · ${clubMembers.length} teammate${clubMembers.length !== 1 ? 's' : ''}`}
      placeholder="Message your club…"
      onBack={onBack}
      onTitleClick={() => setTeammatesOpen((v) => !v)}
      titleMenuOpen={teammatesOpen}
      titleMenu={teammatesMenu}
    />
  );
}
