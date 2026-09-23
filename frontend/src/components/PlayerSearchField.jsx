export default function PlayerSearchField({
  value,
  onChange,
  onSubmit,
  onClear,
  className = "",
}) {
  return (
    <form role="search" onSubmit={onSubmit} className={`relative ${className}`}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="text"
        role="searchbox"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Search players"
        placeholder="Search players, teams, positions"
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-void-600 bg-void-950/80 py-2 pl-9 pr-20 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-500 hover:border-oracle-400/60 focus:border-oracle-400 focus:ring-2 focus:ring-oracle-400/25"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear player search"
          className="absolute right-10 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-void-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
        >
          ×
        </button>
      )}
      <button
        type="submit"
        aria-label="Submit player search"
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-oracle-300 hover:bg-oracle-500/15 hover:text-oracle-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oracle-400"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </form>
  );
}
