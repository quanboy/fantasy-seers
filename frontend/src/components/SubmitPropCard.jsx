import { useState } from "react";
import { propsApi } from "../api/client";

export default function SubmitPropCard({ onSubmitted }) {
  // Controls whether the form is expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form field state
  const [form, setForm] = useState({
    title: "",
    description: "",
    sport: "NBA",
    closesAt: "",
    minWager: "",
    maxWager: "",
  });

  // Generic handler — updates whichever field changed
  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.closesAt) return;
    setLoading(true);
    try {
      await propsApi.submit({
        title: form.title,
        description: form.description || null,
        sport: form.sport,
        // Backend expects ISO format — datetime-local gives us "2026-03-10T20:00"
        // which is already valid
        closesAt: form.closesAt,
        minWager: form.minWager ? parseInt(form.minWager) : null,
        maxWager: form.maxWager ? parseInt(form.maxWager) : null,
      });
      setSuccess(true);
      setForm({
        title: "",
        description: "",
        sport: "NBA",
        closesAt: "",
        minWager: "",
        maxWager: "",
      });
      // Tell the parent something was submitted if needed
      if (onSubmitted) onSubmitted();
      // Collapse after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setIsExpanded(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to submit prop", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setForm({
      title: "",
      description: "",
      sport: "NBA",
      closesAt: "",
      minWager: "",
      maxWager: "",
    });
  };

  // Collapsed state — looks like a regular prop card
  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="bg-gray-900 border border-gray-800 hover:border-blue-600 rounded-2xl p-6 cursor-pointer transition-all mb-4"
      >
        <p className="text-gray-500 text-sm">✍️ Create your own prop...</p>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="bg-gray-900 border border-green-800 rounded-2xl p-6 mb-4">
        <p className="text-green-400 font-semibold text-sm">
          🎉 Prop submitted! It will go live after admin review.
        </p>
      </div>
    );
  }

  // Expanded form state
  return (
    <div className="bg-gray-900 border border-blue-700 rounded-2xl p-6 mb-4">
      <p className="text-white font-semibold mb-4">Create a Prop</p>

      {/* Title */}
      <input
        name="title"
        value={form.title}
        onChange={handleChange}
        placeholder="What's your prop? e.g. Will LeBron score 30+?"
        className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm mb-3 outline-none focus:ring-1 focus:ring-blue-600"
      />

      {/* Description */}
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Add context (optional)"
        rows={2}
        className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm mb-3 outline-none focus:ring-1 focus:ring-blue-600 resize-none"
      />

      {/* Sport + Closing Date row */}
      <div className="flex gap-3 mb-3">
        <select
          name="sport"
          value={form.sport}
          onChange={handleChange}
          className="bg-gray-800 text-white rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600"
        >
          <option value="NBA">NBA</option>
          <option value="NFL">NFL</option>
        </select>

        <input
          name="closesAt"
          type="datetime-local"
          value={form.closesAt}
          onChange={handleChange}
          className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>

      {/* Min/Max wager row */}
      <div className="flex gap-3 mb-4">
        <input
          name="minWager"
          type="number"
          value={form.minWager}
          onChange={handleChange}
          placeholder="Min wager (optional)"
          className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600"
        />
        <input
          name="maxWager"
          type="number"
          value={form.maxWager}
          onChange={handleChange}
          placeholder="Max wager (optional)"
          className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-600"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading || !form.title || !form.closesAt}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all"
        >
          {loading ? "Submitting..." : "Submit for Review"}
        </button>
        <button
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-300 text-sm px-3 py-2 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
