import { useState, useRef, useEffect } from "react";
import { researchApi } from "../api/client";

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      <span className="w-2 h-2 rounded-full bg-oracle-400 animate-pulse" />
      <span className="w-2 h-2 rounded-full bg-oracle-400 animate-pulse [animation-delay:0.2s]" />
      <span className="w-2 h-2 rounded-full bg-oracle-400 animate-pulse [animation-delay:0.4s]" />
    </div>
  );
}

function MessageBubble({ role, answer, sql, error }) {
  const [sqlExpanded, setSqlExpanded] = useState(false);

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] rounded-xl px-4 py-3 bg-oracle-500/15 border border-oracle-500/20">
          <p className="text-slate-200 text-sm">{answer}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[80%] glass-card px-4 py-3">
        {error ? (
          <p className="text-loss-400 text-sm">{error}</p>
        ) : (
          <>
            <p className="text-slate-200 text-sm whitespace-pre-wrap">{answer}</p>
            {sql && (
              <div className="mt-3">
                <button
                  onClick={() => setSqlExpanded(!sqlExpanded)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform ${sqlExpanded ? "rotate-90" : ""}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {sqlExpanded ? "Hide SQL" : "Show SQL"}
                </button>
                {sqlExpanded && (
                  <pre className="mt-2 p-3 rounded-lg bg-void-900 border border-void-700 text-xs text-slate-400 overflow-x-auto">
                    {sql}
                  </pre>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ResearchPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", answer: question }]);
    setLoading(true);

    try {
      const { data } = await researchApi.ask(question);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", answer: data.answer, sql: data.sql },
      ]);
    } catch (err) {
      const msg =
        err.response?.status === 429
          ? "You've hit the rate limit. Please wait before asking another question."
          : err.response?.data?.message || "Something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", error: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-cinzel text-2xl font-bold text-slate-100">Research</h1>
        <p className="text-slate-400 text-sm mt-1">
          Ask questions about player rankings, fan trends, and prediction data.
        </p>
      </div>

      {/* Chat thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 mb-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-slate-500 text-sm">
              Try asking something like:
            </p>
            <div className="mt-3 space-y-2">
              {[
                "Do Eagles fans overrate their own players?",
                "Who has the best prediction accuracy?",
                "What are the top 10 picks by Dolphins fans?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="block w-full text-left px-4 py-2 rounded-lg bg-void-800 border border-void-700 text-slate-300 text-sm hover:border-oracle-500/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="glass-card px-4 py-3">
              <LoadingDots />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={loading}
          className="input-base flex-1"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="btn-oracle px-4 py-2.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
