import React, { useState } from 'react';

// Main App component
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

  // ===== UI =====
  return (
    <div className="min-h-screen custom-bg text-white flex flex-col sm:flex-row p-4 sm:p-8 font-inter">
      {/* LEFT: IMAGE + VISION */}
      <div className="sm:w-1/2 p-4 space-y-6">
        <h1 className="text-3xl font-extrabold text-indigo-400">AI Image Generator & Vision Analyzer</h1>
        <textarea
          className="w-full p-3 rounded-xl text-gray-900 bg-gray-200"
          rows="3"
          placeholder="e.g., A futuristic city at sunset, digital art"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          onClick={generateImage}
          disabled={isLoading || !prompt}
          className="w-full bg-indigo-600 py-2 rounded-xl font-bold"
        >
          {isLoading ? "Generating..." : "Generate Image"}
        </button>

        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
        {uploadedImageBase64 && (
          <button onClick={analyzeUploadedImage} disabled={isVisionLoading} className="w-full bg-purple-600 py-2 rounded-xl">
            {isVisionLoading ? "Analyzing..." : "Analyze Uploaded Image"}
          </button>
        )}

        <div className="w-full h-80 bg-gray-700 rounded-xl flex items-center justify-center">
          {imageUrl ? <img src={imageUrl} alt="Generated" className="max-h-full" /> : <p>No image yet</p>}
        </div>

        {imageUrl && <button onClick={handleDownload} className="w-full bg-emerald-600 py-2 rounded-xl">Download</button>}

        {imageDescription && (
          <div className="bg-gray-700 p-4 rounded-xl">
            <h2 className="font-bold text-indigo-400">Image Description</h2>
            <p>{imageDescription}</p>
          </div>
        )}
      </div>

      {/* RIGHT: CHATBOT */}
      <div className="sm:w-1/2 p-4 flex flex-col bg-gray-800 rounded-3xl shadow-2xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-4">Chat with Gen-AI</h2>
        <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-700 rounded-xl">
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
            className="bg-indigo-600 px-4 rounded-r-xl font-bold"
          >
            {isChatLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
