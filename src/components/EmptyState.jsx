export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-2xl shadow-inner transition-transform duration-300 hover:scale-105">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      {description && (
        <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-slate-500">{description}</p>
      )}
    </div>
  );
}
