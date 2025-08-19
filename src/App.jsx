import React, { useEffect, useMemo, useRef, useState } from "react";

/* ----------------------- Chatbot Panel ----------------------- */
const ChatbotPanel = () => {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Kia ora! Ask me anything ✨" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      const apiUrl = "https://api.together.xyz/v1/chat/completions";
      const payload = {
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        messages: [...messages, { role: "user", content: text }],
        temperature: 0.7,
      };
      if (!apiKey) {
        await new Promise((r) => setTimeout(r, 400));
        setMessages((m) => [...m, { role: "assistant", content: "🤖 (demo) Add VITE_TOGETHER_AI_API_KEY to enable real replies." }]);
      } else {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Chat API: ${res.status}`);
        const data = await res.json();
        const out = data?.choices?.[0]?.message?.content ?? "(no content)";
        setMessages((m) => [...m, { role: "assistant", content: out }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-gray-800 rounded-3xl shadow-2xl p-4 sm:p-6"
      style={{ aspectRatio: "1/1", minHeight: "26rem" }}
    >
      <h2 className="text-2xl font-bold text-indigo-400 mb-3">Chatbot</h2>
      <div className="bg-gray-900 rounded-xl p-3 max-h-[20rem] overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm sm:text-base leading-relaxed ${
              m.role === "user" ? "text-gray-200" : "text-indigo-200"
            }`}
          >
            <span className="font-semibold mr-2">{m.role === "user" ? "You" : "Bot"}:</span>
            <span>{m.content}</span>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm">Thinking…</div>}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type and press Enter…"
          className="flex-1 rounded-xl bg-gray-200 text-gray-900 p-3 focus:outline-none focus:ring-4 focus:ring-indigo-500"
        />
        <button
          onClick={send}
          className="px-4 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

/* ------------------- Image Generator Panel ------------------- */
const ImageGeneratorPanel = () => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [imageDescription, setImageDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [error, setError] = useState("");

  const resetState = () => {
    setError("");
    setImageUrl("");
    setUploadedImageBase64(null);
    setImageDescription("");
    setIsLoading(false);
    setIsVisionLoading(false);
  };

  const describeImage = async (imageData, isBase64 = false) => {
    setIsVisionLoading(true);
    setImageDescription("");
    try {
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      const apiUrl = "https://api.together.xyz/v1/chat/completions";
      const imageContent = isBase64
        ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
        : { type: "image_url", image_url: { url: imageData } };
      const payload = {
        model: "meta-llama/Llama-Vision-Free",
        messages: [{ role: "user", content: [{ type: "text", text: "Describe the image in detail." }, imageContent] }],
      };
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`VLM API: ${res.status}`);
      const data = await res.json();
      setImageDescription(data?.choices?.[0]?.message?.content ?? "");
    } catch {
      setImageDescription("");
    } finally {
      setIsVisionLoading(false);
    }
  };

  const generateImage = async () => {
    resetState();
    setIsLoading(true);
    try {
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      if (!apiKey) throw new Error("API key missing.");
      const apiUrl = "https://api.together.xyz/v1/images/generations";
      const payload = { model: "black-forest-labs/FLUX.1-schnell-Free", prompt, n: 1, size: "1024x1024" };
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Image API: ${res.status}`);
      const data = await res.json();
      const url = data?.data?.[0]?.url;
      if (!url) throw new Error("No image URL returned.");
      setImageUrl(url);
      describeImage(url);
    } catch (e) {
      setError(e.message || "Failed to generate image.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    resetState();
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setImageUrl(dataUrl);
      setUploadedImageBase64(String(dataUrl).split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyzeUploadedImage = () => {
    if (!uploadedImageBase64) return setError("Please upload an image first.");
    describeImage(uploadedImageBase64, true);
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "ai-image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="bg-gray-800 rounded-3xl shadow-2xl p-4 sm:p-6"
      style={{ aspectRatio: "1/1", minHeight: "26rem" }}
    >
      <h2 className="text-2xl font-bold text-indigo-400 mb-2">AI Image Generator & Vision Analyzer</h2>
      <textarea
        className="w-full p-3 rounded-xl text-gray-900 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500"
        rows="3"
        placeholder="e.g., A futuristic city at sunset, digital art"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        onClick={generateImage}
        disabled={isLoading || !prompt.trim()}
        className="w-full mt-3 px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500"
      >
        {isLoading ? "Generating Image..." : "Generate Image"}
      </button>

      <div className="flex items-center justify-center space-x-2 my-4">
        <hr className="flex-grow border-gray-700" />
        <span className="text-gray-400 text-sm font-semibold">OR upload</span>
        <hr className="flex-grow border-gray-700" />
      </div>

      <label className="w-full flex flex-col items-center p-4 rounded-xl text-gray-900 bg-gray-200 hover:bg-gray-300 cursor-pointer">
        <span className="text-sm font-semibold text-gray-600">Click to upload an image</span>
        <input type="file" className="hidden" accept="image/jpeg, image/png, image/jpg" onChange={handleImageUpload} />
      </label>

      {uploadedImageBase64 && (
        <button
          onClick={analyzeUploadedImage}
          disabled={isVisionLoading}
          className="w-full mt-3 px-6 py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500"
        >
          {isVisionLoading ? "Analyzing Image..." : "Analyze Uploaded Image"}
        </button>
      )}

      <div className="w-full mt-4 flex justify-center items-center h-56 bg-gray-700 rounded-xl overflow-hidden shadow-inner">
        {isLoading || isVisionLoading ? (
          <svg className="animate-spin h-10 w-10 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0a12 12 0 00-12 12h4z"></path>
          </svg>
        ) : imageUrl ? (
          <img src={imageUrl} alt="AI Generated or Uploaded" className="w-full h-full object-contain" />
        ) : error ? (
          <p className="text-red-400 text-center px-4">{error}</p>
        ) : (
          <p className="text-gray-400 text-center px-4">Your generated or uploaded image will appear here.</p>
        )}
      </div>

      {imageUrl && (
        <>
          <button
            onClick={handleDownload}
            className="w-full mt-3 px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
          >
            Download Image
          </button>
          <div className="w-full mt-4">
            <h3 className="text-lg font-bold text-indigo-400">Image Description</h3>
            <div className="bg-gray-700 p-4 rounded-xl shadow-inner min-h-[72px]">
              {isVisionLoading ? <div className="text-gray-400">Describing…</div> : <p className="text-gray-200">{imageDescription || "No description yet."}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ---------------- Typing Test + Leaderboard ---------------- */
const TEST_TEXTS = [
  "Design is a conversation between material and intention.",
  "Rammed earth breathes with the climate and anchors the home.",
  "Whenua and wai shape how we inhabit place and remember.",
];

const LB_KEY = "typing_leaderboard_v1";

const TypingSpeedTest = () => {
  const [target, setTarget] = useState(() => TEST_TEXTS[0]);
  const [userText, setUserText] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);
  const [username, setUsername] = useState("");
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      const raw = localStorage.getItem(LB_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const stats = useMemo(() => {
    const chars = userText.length;
    const correct = [...userText].filter((c, i) => c === target[i]).length;
    const accuracy = chars === 0 ? 100 : Math.max(0, Math.round((correct / chars) * 100));
    const endTime = finishedAt ?? (startedAt ? Date.now() : null);
    const minutes = startedAt && endTime ? (endTime - startedAt) / 60000 : 0;
    const words = userText.trim().split(/\s+/).filter(Boolean).length;
    const wpm = minutes > 0 ? Math.round(words / minutes) : 0;
    const complete = userText === target;
    return { accuracy, wpm, complete };
  }, [userText, target, startedAt, finishedAt]);

  const start = () => {
    setUserText("");
    setFinishedAt(null);
    setStartedAt(Date.now());
  };

  const reset = () => {
    setUserText("");
    setStartedAt(null);
    setFinishedAt(null);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    if (!startedAt) setStartedAt(Date.now());
    setUserText(v);
    if (v === target) setFinishedAt(Date.now());
  };

  const nextText = () => {
    const idx = TEST_TEXTS.indexOf(target);
    const next = TEST_TEXTS[(idx + 1) % TEST_TEXTS.length];
    setTarget(next);
    reset();
  };

  const submitLeaderboard = () => {
    if (!username.trim()) return;
    const entry = { name: username.trim(), wpm: stats.wpm, accuracy: stats.accuracy, ts: Date.now() };
    const next = [...leaderboard, entry].sort((a, b) => b.wpm - a.wpm).slice(0, 50);
    setLeaderboard(next);
    localStorage.setItem(LB_KEY, JSON.stringify(next));
  };

  const clearLeaderboard = () => {
    localStorage.removeItem(LB_KEY);
    setLeaderboard([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: typing box */}
      <div className="bg-gray-800 rounded-3xl shadow-2xl p-4 sm:p-6">
        <h2 className="text-2xl font-bold text-indigo-400 mb-3">Typing Speed Test</h2>

        <div className="bg-gray-900 rounded-xl p-4 text-gray-200 leading-relaxed">
          {target.split("").map((ch, i) => {
            const typed = userText[i];
            const cls =
              typed == null ? "text-gray-400" : typed === ch ? "text-emerald-400" : "text-red-400 underline";
            return (
              <span key={i} className={cls}>
                {ch}
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 p-3 rounded-xl text-gray-900 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            onClick={submitLeaderboard}
            disabled={!username.trim()}
            className="px-4 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 disabled:bg-gray-500"
            title="Saves locally in your browser"
          >
            Submit to Leaderboard
          </button>
        </div>

        <textarea
          className="w-full mt-3 p-4 rounded-xl text-gray-900 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500"
          rows={3}
          value={userText}
          onChange={handleChange}
          placeholder="Start typing the text above…"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-300">
          <span className="px-3 py-2 bg-gray-900 rounded-xl">
            WPM: <span className="font-bold">{stats.wpm}</span>
          </span>
          <span className="px-3 py-2 bg-gray-900 rounded-xl">
            Accuracy: <span className="font-bold">{stats.accuracy}%</span>
          </span>
          {stats.complete && <span className="px-3 py-2 bg-emerald-700 rounded-xl">Complete!</span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={start} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold">
            Start
          </button>
          <button onClick={reset} className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold">
            Reset
          </button>
          <button onClick={nextText} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 font-bold">
            Next Text
          </button>
          <button onClick={clearLeaderboard} className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 font-bold">
            Clear Leaderboard
          </button>
        </div>
      </div>

      {/* Right: leaderboard box */}
      <div className="bg-gray-800 rounded-3xl shadow-2xl p-4 sm:p-6">
        <h3 className="text-2xl font-bold text-indigo-400 mb-3">Leaderboard (Local)</h3>
        {leaderboard.length === 0 ? (
          <p className="text-gray-400">No entries yet — set a time and submit!</p>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((e, i) => (
              <li key={`${e.ts}-${i}`} className="flex items-center justify-between bg-gray-900 p-3 rounded-xl">
                <span className="font-bold text-gray-200">{i + 1}.</span>
                <span className="flex-1 ml-3 text-gray-200">{e.name}</span>
                <span className="text-emerald-400 font-bold">{e.wpm} wpm</span>
                <span className="ml-3 text-xs text-gray-400">{new Date(e.ts).toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

/* ----------------------------- App ----------------------------- */
const App = () => {
  return (
    <div className="min-h-screen custom-bg text-white flex justify-center p-4 sm:p-8 font-inter">
      {/* Fixed max width so it doesn't stretch on ultrawide */}
      <div className="w-full max-w-6xl">
        {/* Top: two square panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageGeneratorPanel />
          <ChatbotPanel />
        </div>

        {/* Bottom: Typing test + Leaderboard */}
        <div className="mt-6">
          <TypingSpeedTest />
        </div>
      </div>
    </div>
  );
};

export default App;
