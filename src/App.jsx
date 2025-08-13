import React, { useState } from 'react';

// Main App component
const App = () => {
  // State for the user's text prompt for image generation
  const [prompt, setPrompt] = useState('');
  // State for the generated image URL (as a base64 string)
  const [imageUrl, setImageUrl] = useState('');
  // State for the AI-generated description of the image
  const [imageDescription, setImageDescription] = useState('');
  // State to handle the loading indicator for image generation
  const [isLoading, setIsLoading] = useState(false);
  // State to handle the loading indicator for the vision model description
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  // State for error messages
  const [error, setError] = useState('');

  // Function to handle the image generation API call
  const generateImage = async () => {
    // Clear previous error and image/description
    setError('');
    setImageUrl('');
    setImageDescription('');
    // Set loading state to true for the image generation
    setIsLoading(true);

    try {
      // NOTE: Make sure your API key in .env.local is valid and you have remaining credits.
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      if (!apiKey) {
        throw new Error("API key is missing. Please add it to your .env.local file.");
      }
      const apiUrl = "https://api.together.xyz/v1/images/generations";

      // Construct the payload for the Together AI text-to-image request
      const payload = {
        model: "black-forest-labs/FLUX.1-schnell-Free", 
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      };

      // Perform the fetch call with exponential backoff for retries
      let response;
      let delay = 1000;
      const maxRetries = 5;
      let retries = 0;

      while (retries < maxRetries) {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (response.status !== 429) { 
          break;
        }

        retries++;
        console.warn(`API call failed with status 429. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; 
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Check if the Together AI response contains a valid image URL
      if (result.data && result.data.length > 0 && result.data[0].url) {
        const imageUrlFromTogether = result.data[0].url;
        setImageUrl(imageUrlFromTogether);
        
        // After generating the image, describe it with the vision model
        describeImage(imageUrlFromTogether);

      } else {
        throw new Error('No image data found in the API response.');
      }

    } catch (err) {
      console.error('Failed to generate image:', err);
      setError('Failed to generate image. Please try a different prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW FUNCTION: Function to describe the image using a vision model
  const describeImage = async (imgUrl) => {
    setIsVisionLoading(true);
    setImageDescription('');

    try {
      const apiKey = import.meta.env.VITE_TOGETHER_AI_API_KEY;
      const apiUrl = "https://api.together.xyz/v1/chat/completions";
      
      // Construct the payload for the VLM request
      const payload = {
        model: "meta-llama/Llama-Vision-Free", 
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe the image in detail." },
              { type: "image_url", image_url: { url: imgUrl } }
            ]
          }
        ]
      };

      let response;
      let delay = 1000;
      const maxRetries = 5;
      let retries = 0;

      while (retries < maxRetries) {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (response.status !== 429) {
          break;
        }

        retries++;
        console.warn(`VLM API call failed with status 429. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2;
      }

      if (!response.ok) {
        throw new Error(`VLM API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.choices && result.choices.length > 0 && result.choices[0].message) {
        setImageDescription(result.choices[0].message.content);
      } else {
        throw new Error('No vision data found in the API response.');
      }

    } catch (err) {
      console.error('Failed to describe image:', err);
      // You can set a specific error for the description part if you want
    } finally {
      setIsVisionLoading(false);
    }
  };

  // Function to handle the image download
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

  // UI rendering
  return (
    <div className="min-h-screen custom-bg text-white flex flex-col items-center p-4 sm:p-8 font-inter">
      <div className="bg-gray-800 p-6 sm:p-10 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col items-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-indigo-400">AI Image Generator by AyyLexx</h1>
        <p className="text-center text-gray-400 text-lg">
          Tell me your deepest and darkest desire, I'll create it, no naughty stuff, I'm watching you.
        </p>

        {/* Input area */}
        <div className="w-full">
          <textarea
            className="w-full p-4 rounded-xl text-gray-900 bg-gray-200 focus:outline-none focus:ring-4 focus:ring-indigo-500 transition-all duration-300"
            rows="3"
            placeholder="e.g., A futuristic city at sunset, digital art"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          ></textarea>
        </div>

        {/* Action button */}
        <button
          onClick={generateImage}
          disabled={isLoading || !prompt}
          className={`w-full px-6 py-3 rounded-xl font-bold text-lg transition duration-300 transform shadow-lg
            ${isLoading || !prompt ? 'bg-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}`}
        >
          {isLoading ? 'Generating...' : 'Generate Image'}
        </button>

        {/* Display area for image, loading indicator, or error */}
        <div className="w-full flex justify-center items-center h-96 bg-gray-700 rounded-xl overflow-hidden shadow-inner">
          {isLoading ? (
            // Loading indicator
            <svg className="animate-spin h-10 w-10 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : imageUrl ? (
            // Generated image
            <img src={imageUrl} alt="Generated by AI" className="w-full h-full object-contain" />
          ) : error ? (
            // Error message
            <p className="text-red-400 text-center">{error}</p>
          ) : (
            // Initial prompt
            <p className="text-gray-400 text-center">Your generated image will appear here.</p>
          )}
        </div>

        {/* Download button, visible only when an image exists */}
        {imageUrl && (
          <button
            onClick={handleDownload}
            className="w-full px-6 py-3 rounded-xl font-bold text-lg transition duration-300 transform shadow-lg bg-emerald-600 hover:bg-emerald-700 hover:scale-105 flex items-center justify-center space-x-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span>Download Image</span>
          </button>
        )}

        {/* NEW SECTION: AI-Generated Image Description */}
        {imageUrl && (
          <div className="w-full mt-8 space-y-4">
            <h2 className="text-2xl font-bold text-indigo-400">AI-Generated Image Description</h2>
            <div className="bg-gray-700 p-6 rounded-xl shadow-inner min-h-[100px] flex items-center justify-center">
              {isVisionLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-400">describing what the fuck u just made</span>
                </div>
              ) : imageDescription ? (
                <p className="text-gray-200 text-left">{imageDescription}</p>
              ) : (
                <p className="text-gray-400 text-center">Description will appear here.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
