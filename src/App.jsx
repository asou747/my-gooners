import React, { useEffect, useMemo, useRef, useState } from "react";

/* ----------------------- Chatbot Panel ----------------------- */
const ChatbotPanel = ({ onHeightChange }) => {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Kia ora! Ask me anything ✨" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  // Notify parent when height changes
  useEffect(() => {
    if (!boxRef.current) return;
    onHeightChange?.(boxRef.current.getBoundingClientRect().height);
  }, [messages, loading, onHeightChange]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY; // optional
    try {
      if (!apiKey) {
        // Fallback demo response
        await new Promise((r) => setTimeout(r, 600));
        setMessages((m) => [...m, { role: "assistant", content: "🤖 (demo) Hook up Together API to get real replies." }]);
      } else {
        const payload = {
          model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.7,
        };

        const apiUrl = "https://api.together.xyz/v1/chat/completions";
        let delay = 800;
        const maxRetries = 4;
        for (let tries = 0; tries < maxRetries; tries++) {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });
          if (res.status !== 429) {
            if (!res.ok) throw new Error(`Chat API: ${res.status} ${res.statusText}`);
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content ?? "Hmm, I couldn't parse that.";
            setMessages((m) => [...m, { role: "assistant", content }]);
            break;
          }
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          if (tries === maxRetries - 1) throw new Error("Rate limited. Try again.");
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div ref={boxRef} className="bg-gray-800 rounded-3xl shadow-2xl p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-indigo-400 mb-3">Chatbot</h2>

      {/* Scroll-limited chat window */}
      <div className="bg-gray-900 rounded-xl p-3 max-h-[24rem] overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm sm:text-base leading-relaxed ${
              m.role === "user" ? "text-gray-200" : "text-indigo-200"
            }`}
          >
            <span className="font-semibold mr-2">
              {m.role === "user" ? "You" : "Bot"}:
            </span>
            <span>{m.content}</span>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-sm">Thinking…</div>}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type and press Enter…"
          className="flex-1 rounded-xl bg-gray-200 text-gray-900 p-3 focus:outline-none focus:ring-4 focus:ring-indigo-500"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className={`px-4 py-3 rounded-xl font-bold transition ${
            loading || !input.trim()
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

/* ------------------- Image Generator Panel ------------------- */
const ImageGeneratorPanel = ({ onHeightChange }) => {
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [imageDescription, setImageDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  const resetState = () => {
    setError("");
    setImageUrl("");
    setUploadedImageBase64(null);
    setImageDescription("");
    setIsLoading(false);
    setIsVisionLoading(false);
  };

  useEffect(() => {
    if (!boxRef.current) return;
    onHeightChange?.(boxRef.current.getBoundingClientRect().height);
  }, [prompt, imageUrl, imageDescription, isLoading, isVisionLoading, error, onHeightChange]);

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
        messages: [
          { role: "user", content: [{ type: "text", text: "Describe the image in detail." }, imageContent] },
        ],
      };

      let delay = 800;
      const maxRetries = 4;
      for (let tries = 0; tries < maxRetries; tries++) {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(payload),
        });
        if (res.status !== 429) {
          if (!res.ok) throw new Error(`VLM API: ${res.status} ${res.statusText}`);
          const data = await res.json();
          setImageDescription(data?.choices?.[0]?.message?.content ?? "");
          break;
        }
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        if (tries === maxRetries - 1) throw new Error("Rate limited. Try again.");
      }
    } catch (err) {
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
      if (!apiKey) throw new Error("API key is missing. Add VITE_TOGETHER_AI_API_KEY to your env.");
      const apiUrl = "https://api.together.xyz/v1/images/generations";
      const payload = { model: "black-forest-labs/FLUX.1-schnell-Free", prompt, n: 1, size: "1024x1024" };

      let delay = 800;
      const maxRetries = 4;
      for (let tries = 0; tries < maxRetries; tries++) {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(payload),
        });
        if (res.status !== 429) {
          if (!res.ok) throw new Error(`Image API: ${res.status} ${res.statusText}`);
          const data = await res.json();
          const url = data?.data?.[0]?.url;
          if (!url) throw new Error("No image URL returned.");
          setImageUrl(url);
          describeImage(url);
          break;
        }
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        if (tries === maxRetries - 1) throw new Error("Rate limited. Try again.");
      }
    } catch (err) {
      setError(err.message || "Failed to generate image.");
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
      const base64 = String(dataUrl).split(",")[1];
      setUploadedImageBase64(base64);
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
    <div ref={boxRef} className="bg-gray-800 rounded-3xl shadow-2xl p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-indigo-400 mb-2">AI Image Generator & Vision Analyzer</h2>
      <p className="text-sm text-gray-400 mb-4">
        Type a prompt or upload an image. I’ll generate and/or describe it.
      </p>

      <textarea
        className="w-full p-4 rounded-xl text-gray-900 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500"
        rows="3"
        placeholder="e.g., A futuristic city at sunset, digital art"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        onClick={generateImage}
        disabled={isLoading || !prompt.trim()}
        className={`w-full mt-3 px-6 py-3 rounded-xl font-bold transition shadow-lg ${
          isLoading || !prompt.trim()
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]"
        }`}
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
          className={`w-full mt-3 px-6 py-3 rounded-xl font-bold transition shadow-lg ${
            isVisionLoading ? "bg-gray-500 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700 hover:scale-[1.02]"
          }`}
        >
          {isVisionLoading ? "Analyzing Image..." : "Analyze Uploaded Image"}
        </button>
      )}

      <div className="w-full mt-4 flex justify-center items-center h-80 bg-gray-700 rounded-xl overflow-hidden shadow-inner">
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
            className="w-full mt-3 px-6 py-3 rounded-xl font-bold transition shadow-lg bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02]"
          >
            Download Image
          </button>

            <div className="w-full mt-6 space-y-2">
              <h3 className="text-xl font-bold text-indigo-400">Image Description</h3>
              <div className="bg-gray-700 p-4 rounded-xl shadow-inner min-h-[90px]">
                {isVisionLoading ? (
                  <div className="text-gray-400">Describing…</div>
                ) : (
                  <p className="text-gray-200">{imageDescription || "No description yet."}</p>
                )}
              </div>
            </div>
        </>
      )}
    </div>
  );
};

/* ----------------------- Typing Speed Test ----------------------- */
const TEST_TEXTS = [
  "Design is a conversation between material and intention.",
  "Rammed earth breathes with the climate and anchors the home.",
  "Whenua and wai shape how we inhabit place and remember."
];

const TypingSpeedTest = () => {
  const [target, setTarget] = useState(() => TEST_TEXTS[0]);
  const [userText, setUserText] = useState("");
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);

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

  return (
    <div className="bg-gray-800 rounded-3xl shadow-2xl p-4 sm:p-6 w-full">
      <h2 className="text-2xl font-bold text-indigo-400 mb-3">Typing Speed Test</h2>

      <div className="bg-gray-900 rounded-xl p-4 text-gray-200 leading-relaxed">
        {target.split("").map((ch, i) => {
          const typed = userText[i];
          const cls =
            typed == null
              ? "text-gray-400"
              : typed === ch
              ? "text-emerald-400"
              : "text-red-400 underline";
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}
      </div>

      <textarea
        className="w-full mt-3 p-4 rounded-xl text-gray-900 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500"
        rows={3}
        value={userText}
        onChange={handleChange}
        placeholder="Start typing the text above…"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-300">
        <span className="px-3 py-2 bg-gray-900 rounded-xl">WPM: <span className="font-bold">{stats.wpm}</span></span>
        <span className="px-3 py-2 bg-gray-900 rounded-xl">Accuracy: <span className="font-bold">{stats.accuracy}%</span></span>
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
      </div>
    </div>
  );
};

/* ----------------------------- App ----------------------------- */
const App = () => {
  const [leftHeight, setLeftHeight] = useState(0);
  const [rightHeight, setRightHeight] = useState(0);
  const [chatOnLeft, setChatOnLeft] = useState(true);

  // Swap columns if chatbot is shorter than the image generator (for visual balance)
  useEffect(() => {
    setChatOnLeft(!(rightHeight > leftHeight)); // if right (image) taller than left (chat), put image on left
  }, [leftHeight, rightHeight]);

  // Re-measure on resize
  useEffect(() => {
    const onResize = () => {
      setLeftHeight((h) => h + 0); // trigger effect
      setRightHeight((h) => h + 0);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const Left = chatOnLeft ? ChatbotPanel : ImageGeneratorPanel;
  const Right = chatOnLeft ? ImageGeneratorPanel : ChatbotPanel;

  return (
    <div className="min-h-screen custom-bg text-white flex flex-col items-center p-4 sm:p-8 font-inter">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <Left onHeightChange={setLeftHeight} />

        {/* Right column */}
        <Right onHeightChange={setRightHeight} />

        {/* Full-width typing speed test */}
        <div className="lg:col-span-2">
          <TypingSpeedTest />
        </div>
      </div>
    </div>
  );
};

export default App;
