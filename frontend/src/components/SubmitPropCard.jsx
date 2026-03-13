import { useState, useEffect } from "react";
import { propsApi, groupsApi } from "../api/client";

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "UFC", "EPL"];

const SCOPES = [
  { value: "PUBLIC", label: "Public" },
  { value: "FRIENDS", label: "Friends" },
  { value: "GROUP", label: "Group" },
  { value: "FRIENDS_AND_GROUP", label: "Friends + Group" },
];

export default function SubmitPropCard({ onSubmitted }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [groups, setGroups] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    sport: "NBA",
    closesAt: "",
    minWager: "",
    maxWager: "",
    scope: "PUBLIC",
    groupId: "",
  });

  useEffect(() => {
    if (isExpanded && groups.length === 0) {
      groupsApi.getMyGroups().then(({ data }) => setGroups(data)).catch(() => {});
    }
  }, [isExpanded]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const needsGroup = form.scope === "GROUP" || form.scope === "FRIENDS_AND_GROUP";

  const handleSubmit = async () => {
    if (!form.title || !form.closesAt) return;
    if (needsGroup && !form.groupId) return;
    setLoading(true);
    try {
      await propsApi.submit({
        title: form.title,
        description: form.description || null,
        sport: form.sport,
        closesAt: form.closesAt,
        minWager: form.minWager ? parseInt(form.minWager) : null,
        maxWager: form.maxWager ? parseInt(form.maxWager) : null,
        scope: form.scope,
        groupId: needsGroup && form.groupId ? parseInt(form.groupId) : null,
      });
      setSuccess(true);
      setForm({ title: "", description: "", sport: "NBA", closesAt: "", minWager: "", maxWager: "", scope: "PUBLIC", groupId: "" });
      if (onSubmitted) onSubmitted();
      setTimeout(() => { setSuccess(false); setIsExpanded(false); }, 2500);
    } catch (err) {
      console.error("Failed to submit prop", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setForm({ title: "", description: "", sport: "NBA", closesAt: "", minWager: "", maxWager: "", scope: "PUBLIC", groupId: "" });
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="mb-4 rounded-2xl p-5 cursor-pointer transition-all duration-300 group"
        style={{ background: 'linear-gradient(145deg, #161825, #0E1018)', border: '1px solid #1E2235', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C1D95'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), 0 0 20px rgba(124,58,237,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2235'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)'; }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <span className="text-oracle-400 text-sm">✍</span>
          </div>
          <div>
            <p className="text-slate-500 text-sm group-hover:text-slate-400 transition-colors">
              Make a call — what's your take?
            </p>
            <p className="text-slate-700 text-xs mt-0.5">Post a prop for others to challenge</p>
          </div>
          <div className="ml-auto">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-oracle-600">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mb-4 rounded-2xl p-5 animate-scale-in"
        style={{ background: 'rgba(6,78,59,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔮</span>
          <div>
            <p className="text-win-400 font-semibold text-sm">Prop submitted!</p>
            <p className="text-slate-600 text-xs mt-0.5">Goes live after admin review — usually within minutes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl p-6 animate-scale-in"
      style={{ background: 'linear-gradient(145deg, #161825, #0E1018)', border: '1px solid #4C1D95', boxShadow: '0 0 24px rgba(124,58,237,0.1)' }}>

      <div className="flex items-center gap-2 mb-5">
        <span className="font-display text-base font-700 text-white">Create a Prop</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.4), transparent)' }} />
      </div>

      {/* Title */}
      <div className="mb-3">
        <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Your call</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder='e.g. "Will LeBron drop 35+ tonight?"'
          className="input-base text-sm"
        />
      </div>

      {/* Description */}
      <div className="mb-3">
        <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Context <span className="normal-case text-slate-700">(optional)</span></label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Add your reasoning, stats, or context..."
          rows={2}
          className="input-base text-sm resize-none"
        />
      </div>

      {/* Sport + closing time */}
      <div className="flex gap-3 mb-3">
        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Sport</label>
          <select
            name="sport"
            value={form.sport}
            onChange={handleChange}
            className="input-base text-sm w-auto pr-8"
            style={{ appearance: 'none' }}
          >
            {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Closes at</label>
          <input
            name="closesAt"
            type="datetime-local"
            value={form.closesAt}
            onChange={handleChange}
            className="input-base text-sm w-full"
          />
        </div>
      </div>

      {/* Scope */}
      <div className="mb-3">
        <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Visibility</label>
        <div className="flex gap-2 flex-wrap">
          {SCOPES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, scope: s.value, groupId: "" }))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={form.scope === s.value
                ? { background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.6)', color: '#C4B5FD' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid #1E2235', color: '#64748B' }
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Group selector — shown when scope requires a group */}
      {needsGroup && (
        <div className="mb-3">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Group</label>
          {groups.length === 0 ? (
            <p className="text-slate-600 text-xs">
              You have no groups yet.{" "}
              <a href="/groups" className="text-oracle-400 hover:underline">Create one</a>.
            </p>
          ) : (
            <select
              name="groupId"
              value={form.groupId}
              onChange={handleChange}
              className="input-base text-sm w-full"
              style={{ appearance: 'none' }}
            >
              <option value="">Select a group…</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Wager limits */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Min wager <span className="normal-case text-slate-700">(optional)</span></label>
          <input
            name="minWager"
            type="number"
            value={form.minWager}
            onChange={handleChange}
            placeholder="e.g. 100"
            className="input-base text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-2">Max wager <span className="normal-case text-slate-700">(optional)</span></label>
          <input
            name="maxWager"
            type="number"
            value={form.maxWager}
            onChange={handleChange}
            placeholder="e.g. 5000"
            className="input-base text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading || !form.title || !form.closesAt || (needsGroup && !form.groupId)}
          className="btn-oracle flex-1 py-3 text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </span>
          ) : "Submit for Review"}
        </button>
        <button
          onClick={handleCancel}
          className="text-slate-500 hover:text-slate-300 text-sm px-4 py-3 rounded-xl transition-all hover:bg-void-800"
        >
          Cancel
        </button>
      </div>

      <p className="text-slate-700 text-xs mt-3">
        Props are reviewed by our team before going live. Usually approved within 30 minutes.
      </p>
    </div>
  );
}
