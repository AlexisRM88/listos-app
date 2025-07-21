
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import Stripe from 'stripe';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

// --- CONFIGURATION & VALIDATION ---
const {
    GEMINI_API_KEY,
    STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID,
    GOOGLE_CLIENT_ID,
    PORT = 8080
} = process.env;

const requiredEnvVars = { GEMINI_API_KEY, STRIPE_SECRET_KEY, STRIPE_PRICE_ID, GOOGLE_CLIENT_ID };
const missingEnvVars = Object.entries(requiredEnvVars).filter(([, value]) => !value);

if (missingEnvVars.length > 0) {
    console.error("FATAL ERROR: Missing required environment variables:");
    for (const [key] of missingEnvVars) {
        console.error(`- ${key} is not set.`);
    }
    process.exit(1); // Exit with an error code
}

// --- INITIALIZATIONS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const stripe = new Stripe(STRIPE_SECRET_KEY);
const authClient = new OAuth2Client(GOOGLE_CLIENT_ID);


// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const verifyGoogleToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication token is required.' });
        }
        const idToken = authHeader.split(' ')[1];
        
        await authClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        });

        next();
    } catch (error) {
        console.error('Google token verification failed:', error.message);
        res.status(403).json({ error: 'Authentication failed. Invalid token.' });
    }
};

// --- API ENDPOINTS ---

app.post('/api/gemini', verifyGoogleToken, async (req, res) => {
    try {
        const { modelContents, config } = req.body;

        if (!modelContents) {
            return res.status(400).json({ error: 'Missing "modelContents" in request body.' });
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: modelContents,
            config: {
                ...config,
                responseMimeType: "application/json", 
            }
        });

        let responseText = response.text;
        
        // The model can sometimes wrap the JSON in markdown or add extra text.
        // This regex finds the main JSON object within the response.
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch && jsonMatch[0]) {
            try {
                // Validate that the extracted text is actually valid JSON.
                JSON.parse(jsonMatch[0]);
                responseText = jsonMatch[0];
            } catch (parseError) {
                console.warn('Backend failed to parse extracted JSON from Gemini. Passing original text to frontend.', parseError.message);
                // If parsing fails, we'll send the original text and let the frontend's more detailed error handling work.
            }
        } else {
             console.warn('Backend could not find a JSON object in the Gemini response.');
        }

        res.json({ text: responseText });

    } catch (error) {
        console.error('Error in Gemini proxy:', error);
        res.status(500).json({ error: 'An error occurred while calling the Gemini API.' });
    }
});

app.post('/api/stripe/create-checkout-session', verifyGoogleToken, async (req, res) => {
    try {
        const domain = req.protocol + '://' + req.get('host');
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: STRIPE_PRICE_ID,
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${domain}?payment_success=true`,
            cancel_url: `${domain}?payment_cancelled=true`,
        });

        res.json({ sessionId: session.id });

    } catch (error) {
        console.error('Error creating Stripe session:', error);
        res.status(500).json({ error: `An error occurred with the payment provider: ${error.message}` });
    }
});


// --- STATIC FILE SERVING for Frontend ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// For any other GET request, serve the index.html file for the SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});


// --- SERVER START ---
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});