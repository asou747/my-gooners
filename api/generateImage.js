// api/generateImage.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const apiKey = process.env.GOOGLE_API_KEY; // Hidden key in env
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

    const payload = {
      instances: {
        prompt: prompt
      },
      parameters: {
        sampleCount: 1
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (
      result.predictions &&
      result.predictions.length > 0 &&
      result.predictions[0].bytesBase64Encoded
    ) {
      res.status(200).json({
        image: `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`
      });
    } else {
      res.status(500).json({ error: 'No image data found.' });
    }
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image.' });
  }
}
