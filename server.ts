import express from 'express';
import path from 'path';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';

// Initialize SDK
// Make sure GEMINI_API_KEY is available in the environment
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/parse-order', upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file provided.' });
      }

      console.log('Parsing PDF order size:', req.file.size);

      // We will use gemini-2.5-flash to avoid free tier quota limitations 
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: req.file.buffer.toString('base64'),
                }
              },
              { text: "Extract all loading (завантаження) and unloading (розвантаження) addresses from this transport order. A transport order is often called 'Zlecenie transportowe'. Try to order them chronologically if possible, or extract their designated sequence. Also extract the client company name if available." }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: {
                type: Type.STRING,
                description: "Name of the client or company ordering the transport."
              },
              waypoints: {
                type: Type.ARRAY,
                description: "List of loading/unloading points in chronological order.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: "Either 'loading' or 'unloading'."
                    },
                    address: {
                      type: Type.STRING,
                      description: "The full address of the location (street, postal code, city, country)."
                    },
                    company: {
                      type: Type.STRING,
                      description: "The name of the facility/company at this address."
                    }
                  },
                  required: ["type", "address"]
                }
              }
            },
            required: ["waypoints"]
          }
        }
      });

      const resultText = response.text || "{}";
      const resultObj = JSON.parse(resultText);

      res.json(resultObj);
    } catch (error: any) {
      console.error('Error parsing order:', error);
      res.status(500).json({ error: error.message || 'Failed to parse document' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
