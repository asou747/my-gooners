import React, { useState, useMemo, useRef, useEffect } from 'react';

// ----------------------- Typing Speed Test -----------------------
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

// ----------------------- Main App -----------------------
const App = () => {
  // ===== IMAGE GENERATION + VISION STATES =====
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [imageDescription, setImageDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [error, setError] = useState('');

  // ===== CHATBOT STATES =====
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "👋 Hi! I’m your AI assistant. Ask me anything." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // (Optional) panel refs if you later want to auto-swap columns based on height
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  useEffect(() => {
    // placeholder: you can read heights via leftRef.current?.offsetHeight etc.
  }, []);

  // ===== RESET IMAGE STATES =====
  const resetState = () => {
    setError('');
    setImageUrl('');
    setUploadedImageBase64(null);
    setImageDescription('');
    setIsLoading(false);
    setIsVisionLoading(false);
  };

  // ===== IMAGE GENERATION =====
  const generateImage = async () => {
    resetState();
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      if (!apiKey) throw new Error("API key missing.");

      const apiUrl = "https://api.together.xyz/v1/images/generations";
      const payload = {
        model: "black-forest-labs/FLUX.1-schnell-Free",
        prompt,
        n: 1,
        size: "1024x1024"
      };

      let response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const result = await response.json();

      if (result.data && result.data[0]?.url) {
        const imageUrlFromTogether = result.data[0].url;
        setImageUrl(imageUrlFromTogether);
        describeImage(imageUrlFromTogether);
      } else {
        throw new Error('No image data found.');
      }
    } catch (err) {
      console.error(err);
      setError('⚠️ Failed to generate image.');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== FILE UPLOAD =====
  const handleImageUpload = (event) => {
    resetState();
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        setImageUrl(dataUrl);
        const base64String = dataUrl.split(',')[1];
        setUploadedImageBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // ===== IMAGE ANALYSIS =====
  const analyzeUploadedImage = () => {
    if (uploadedImageBase64) {
      describeImage(uploadedImageBase64, true);
    } else {
      setError('Please upload an image first.');
    }
  };

  const describeImage = async (imageData, isBase64 = false) => {
    setIsVisionLoading(true);
    setImageDescription('');

    try {
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      const apiUrl = "https://api.together.xyz/v1/chat/completions";

      let imageContent = isBase64
        ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } }
        : { type: "image_url", image_url: { url: imageData } };

      const payload = {
        model: "meta-llama/Llama-Vision-Free",
        messages: [{ role: "user", content: [{ type: "text", text: "Describe the image in detail." }, imageContent] }]
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`VLM API error: ${response.status}`);
      const result = await response.json();
      setImageDescription(result.choices?.[0]?.message?.content || "No description found.");
    } catch (err) {
      console.error(err);
      setImageDescription("⚠️ Failed to analyze image.");
    } finally {
      setIsVisionLoading(false);
    }
  };

  // ===== IMAGE DOWNLOAD =====
  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = 'ai-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // ===== CHATBOT FUNCTION =====
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      const apiUrl = "https://api.together.xyz/v1/chat/completions";

      const payload = {
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        messages: newMessages.map(m => ({ role: m.role, content: m.content }))
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Chat API error: ${response.status}`);
      const result = await response.json();
      const reply = result.choices[0].message.content;

      setChatMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages([...newMessages, { role: "assistant", content: "⚠️ Sorry, I had an error." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen custom-bg text-white flex flex-col p-4 sm:p-8 font-inter">
      {/* Top: two columns */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* LEFT: IMAGE + VISION */}
        <div ref={leftRef} className="sm:w-1/2 p-4 space-y-6 bg-gray-800 rounded-3xl shadow-2xl">
          <h1 className="text-3xl font-extrabold text-indigo-400">AI Image Generator & Vision Analyzer</h1>

          <textarea
            className="w-full p-3 rounded-xl text-gray-900 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500"
            rows="3"
            placeholder="e.g., A futuristic city at sunset, digital art"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />

          <button
            onClick={generateImage}
            disabled={isLoading || !prompt}
            className="w-full bg-indigo-600 py-2 rounded-xl font-bold disabled:bg-gray-500"
          >
            {isLoading ? "Generating..." : "Generate Image"}
          </button>

          <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
          {uploadedImageBase64 && (
            <button
              onClick={analyzeUploadedImage}
              disabled={isVisionLoading}
              className="w-full bg-purple-600 py-2 rounded-xl disabled:bg-gray-500"
            >
              {isVisionLoading ? "Analyzing..." : "Analyze Uploaded Image"}
            </button>
          )}

          <div className="w-full h-80 bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
            {imageUrl ? <img src={imageUrl} alt="Generated" className="max-h-full" /> : <p>No image yet</p>}
          </div>

          {imageUrl && (
            <button onClick={handleDownload} className="w-full bg-emerald-600 py-2 rounded-xl">
              Download
            </button>
          )}

          {imageDescription && (
            <div className="bg-gray-700 p-4 rounded-xl">
              <h2 className="font-bold text-indigo-400">Image Description</h2>
              <p>{imageDescription}</p>
            </div>
          )}
        </div>

        {/* RIGHT: CHATBOT */}
        <div ref={rightRef} className="sm:w-1/2 p-4 flex flex-col bg-gray-800 rounded-3xl shadow-2xl">
          <h2 className="text-2xl font-bold text-indigo-400 mb-4">Chat with Gen-AI</h2>

          {/* Scroll-limited chat window */}
          <div className="overflow-y-auto space-y-3 p-4 bg-gray-700 rounded-xl max-h-[28rem]">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg max-w-[80%] ${
                  m.role === "user" ? "bg-indigo-600 ml-auto text-right" : "bg-gray-600 mr-auto text-left"
                }`}
              >
                {m.content}
              </div>
            ))}
            {isChatLoading && <div className="text-sm text-gray-300">Thinking…</div>}
          </div>

          <div className="flex mt-4">
            <input
              type="text"
              className="flex-1 p-3 rounded-l-xl text-gray-900 bg-gray-200"
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            />
            <button
              onClick={sendChatMessage}
              disabled={isChatLoading}
              className="bg-indigo-600 px-4 rounded-r-xl font-bold disabled:bg-gray-500"
            >
              {isChatLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom: full-width Typing Speed Test */}
      <div className="mt-6">
        <TypingSpeedTest />
      </div>
    </div>
  );
};

export default App;
