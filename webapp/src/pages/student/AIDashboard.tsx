import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

type Tab = "chat" | "errors" | "diagnose";

export default function AIDashboard() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-mono text-accent mb-6">ЖИ диагноз зертханасы</h1>

      <div className="flex gap-1 mb-6 border-b border-border">
        {(["chat", "errors", "diagnose"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-[1px] ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t === "chat" && "💬 Чат"}
            {t === "errors" && "🔍 Қателік талдауы"}
            {t === "diagnose" && "🩺 ЖИ диагнозы"}
          </button>
        ))}
      </div>

      {tab === "chat" && <ChatTab />}
      {tab === "errors" && <ErrorAnalysisTab />}
      {tab === "diagnose" && <DiagnoseTab />}
    </div>
  );
}

function ChatTab() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convoId, setConvoId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/conversations", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConvo = async (id: string) => {
    const res = await fetch(`/api/ai/conversations/${id}`, { credentials: "include" });
    const data = await res.json();
    setMessages(data.messages || []);
    setConvoId(id);
  };

  const newChat = () => {
    setMessages([]);
    setConvoId(null);
  };

  const deleteConvo = async (id: string) => {
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE", credentials: "include" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (convoId === id) newChat();
  };

  const saveConvo = async (msgs: Array<{ role: string; content: string }>) => {
    const title = msgs.find((m) => m.role === "user")?.content?.slice(0, 50) || "New Chat";
    if (convoId) {
      await fetch(`/api/ai/conversations/${convoId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, messages: msgs }),
      });
    } else {
      const res = await fetch("/api/ai/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, messages: msgs }),
      });
      const data = await res.json();
      setConvoId(data.id);
    }
    const r = await fetch("/api/ai/conversations", { credentials: "include" });
    const d = await r.json();
    setConversations(d.conversations || []);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const updated = [...messages, userMsg, { role: "assistant", content: "" }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: updated.slice(0, -1) }),
      });

      if (!res.ok) throw new Error("Stream failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buffer = "";
      let finalMessages = updated;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content ||
                          parsed.choices?.[0]?.delta?.reasoning || "";
            if (delta) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  next[next.length - 1] = { ...last, content: last.content + delta };
                }
                finalMessages = next;
                return next;
              });
            }
          } catch {}
        }
      }
      saveConvo(finalMessages);
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === "assistant" && !last.content) {
          next[next.length - 1] = { ...last, content: "Қате. Қайтадан көріңіз." };
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 min-h-[500px]">
      <div className="w-48 flex-shrink-0 space-y-1">
        <button onClick={newChat} className="w-full text-left glass rounded-lg px-3 py-2 text-sm hover:border-accent/30 transition-all">
          + Жаңа чат
        </button>
        {conversations.map((c) => (
          <div key={c.id} className="group flex items-center">
            <button
              onClick={() => loadConvo(c.id)}
              className={`flex-1 text-left text-xs px-3 py-1.5 rounded truncate ${convoId === c.id ? "bg-accent/10 text-accent" : "text-muted hover:text-text"}`}
            >
              {c.title}
            </button>
            <button
              onClick={() => deleteConvo(c.id)}
              className="text-muted hover:text-red-400 text-xs px-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex-1 glass rounded-xl p-4 flex flex-col">
        <div className="flex-1 space-y-3 mb-3 max-h-[60vh] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-muted text-center pt-20">
              Жаңа чат бастаңыз немесе сөйлесуді таңдаңыз.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-accent text-bg" : "bg-surface border border-border text-text"
              }`}>
                <p className="whitespace-pre-wrap">{m.content || (loading && m.role === "assistant" && i === messages.length - 1 ? (
                  <span className="inline-block w-2 h-4 bg-accent animate-pulse rounded-sm ml-0.5" />
                ) : null)}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Жағдай жайлы сұраңыз..." className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted outline-none focus:border-accent" />
          <button type="submit" disabled={loading || !input.trim()} className="bg-accent text-bg rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40">Жіберу</button>
        </form>
      </div>
    </div>
  );
}

function ErrorAnalysisTab() {
  const [searchParams] = useSearchParams();
  const [attemptId, setAttemptId] = useState(searchParams.get("attempt") ?? "");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!attemptId.trim()) return;
    setLoading(true);
    setAnalysis("");
    try {
      const res = await fetch("/api/ai/analyze-error", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      setAnalysis(data.reply);
      // Save to history
      await fetch("/api/ai/diagnoses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ symptoms: `Attempt ${attemptId}`, result: data.reply }),
      });
    } catch {
      setAnalysis("Error loading analysis.");
    } finally { setLoading(false); }
  };

  return (
    <div className="glass rounded-xl p-6 min-h-[500px]">
      <p className="text-sm text-muted mb-4">
        ЖИ қателік талдауы үшін әрекет идентификаторын{" "}
        <a href="/progress" className="text-accent hover:underline">Прогресс → Соңғы әрекеттер</a>
        {" "}бетінен көшіріңіз немесе{" "}
        <Link to="/history/errors" className="text-accent hover:underline">қателер тарихынан</Link>
        {" "}таңдаңыз.
      </p>
      <div className="flex gap-2 mb-6">
        <input value={attemptId} onChange={(e) => setAttemptId(e.target.value)} placeholder="Әрекет идентификаторы" className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-muted outline-none focus:border-accent font-mono" />
        <button onClick={analyze} disabled={loading || !attemptId.trim()} className="bg-accent text-bg rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-40">{loading ? "Талдануда..." : "Талдау"}</button>
      </div>
      {loading && <div className="text-sm text-muted animate-pulse">ЖИ талдау жасайды...</div>}
      {analysis && <div className="bg-surface border border-border rounded-lg p-4 text-sm text-text whitespace-pre-wrap leading-relaxed">{analysis}</div>}
    </div>
  );
}

function DiagnoseTab() {
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [history, setHistory] = useState<Array<{ id: string; symptoms: string; createdAt: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/ai/diagnoses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setHistory(d.diagnoses || []))
      .catch(() => {});
  }, []);

  const diagnose = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    try {
      let prompt = symptoms;
      if (notes.trim()) prompt += "\n\nNotes:\n" + notes;
      if (files.length > 0) prompt += `\n\n[${files.length} file(s) attached: ${files.map(f => f.name).join(", ")}]`;

      const res = await fetch("/api/ai/diagnose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ symptoms: prompt }),
      });
      const data = await res.json();
      setResult(data.reply);

      await fetch("/api/ai/diagnoses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ symptoms: prompt.slice(0, 200), notes, result: data.reply }),
      });
      const r = await fetch("/api/ai/diagnoses", { credentials: "include" });
      const d = await r.json();
      setHistory(d.diagnoses || []);
    } catch {
      setResult("Error. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="glass rounded-xl p-6 min-h-[500px]">
      <p className="text-sm text-muted mb-4">Белгілерді сипаттаңыз және қажет болғанда суреттер/құжаттарды тіркеңіз.</p>
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs text-muted block mb-1">Белгілер *</label>
          <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="мысалы, 25 жастағы ер адам, оң жақ іштің төменгі бөлігінде кенеттің ауырсыну..." className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-muted outline-none focus:border-accent h-28 resize-none" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Қосымша жазбалар</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Талдау нәтижелері, бақылаулар..." className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-muted outline-none focus:border-accent h-20 resize-none" />
        </div>
        <div>
          <label className="text-xs text-muted block mb-1">Файлдарды тіркеу</label>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} />
          <div className="flex gap-2 items-center">
            <button onClick={() => fileRef.current?.click()} className="glass rounded-lg px-3 py-1.5 text-xs text-muted hover:text-text">
              Файлдарды таңдау
            </button>
            {files.length > 0 && <span className="text-xs text-muted">{files.length} файл(дар) таңдалды</span>}
          </div>
        </div>
      </div>

      <button onClick={diagnose} disabled={loading || !symptoms.trim()} className="bg-accent text-bg rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-40 mb-6">
        {loading ? "Талдануда..." : "Диагнозды іске қосу"}
      </button>

      {loading && <div className="text-sm text-muted animate-pulse">ЖИ дифференциалды диагнозды жасайды...</div>}
      {result && <div className="bg-surface border border-border rounded-lg p-4 text-sm text-text whitespace-pre-wrap leading-relaxed mb-6">{result}</div>}

      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-mono text-muted uppercase tracking-wider">Алдыңғы диагноздар</h4>
            <Link to="/history/diagnoses" className="text-xs text-accent hover:underline">Толық тарих →</Link>
          </div>
          <div className="space-y-1">
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="text-xs text-muted glass rounded px-3 py-1.5 truncate">
                {h.symptoms.slice(0, 80)} — {new Date(h.createdAt).toLocaleDateString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
