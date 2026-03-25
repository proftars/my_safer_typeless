import 'dotenv/config'; // Load .env before anything else
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { initDb, closeDb } from './db';
import { checkGroqHealth } from './services/stt-groq';
import { checkOllamaHealth } from './services/ollama';

// Import routes
import authRoutes from './routes/auth';
import transcribeRoutes from './routes/transcribe';
import vocabularyRoutes from './routes/vocabulary';
import historyRoutes from './routes/history';
import settingsRoutes from './routes/settings';
import statsRoutes from './routes/stats';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve admin portal static files (when built)
const adminPortalPath = path.join(__dirname, '..', '..', 'admin-portal', 'dist');
app.use('/admin', express.static(adminPortalPath));

// Redirect /admin to /admin/ (trailing slash needed for static serving)
app.get('/admin', (_req, res) => {
  res.redirect('/admin/');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', async (_req, res) => {
  const groqOk = await checkGroqHealth();
  const ollama = await checkOllamaHealth();

  res.json({
    status: 'ok',
    version: '1.0.0',
    services: {
      groq: groqOk ? 'connected' : 'unavailable',
      ollama: ollama.running
        ? ollama.modelLoaded
          ? 'ready'
          : 'running (model not loaded)'
        : 'unavailable',
      whisperCpp: 'available (fallback)',
    },
    timestamp: new Date().toISOString(),
  });
});

// Admin portal SPA fallback
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(adminPortalPath, 'index.html'));
});

// Start server
async function start() {
  // Initialize database
  initDb();

  app.listen(config.port, config.host, async () => {
    console.log('');
    console.log('  My Safer Typeless Server v1.0.0');
    console.log('  ================================');
    console.log(`  Server:       http://${config.host}:${config.port}`);
    console.log(`  Admin Portal: http://${config.host}:${config.port}/admin`);
    console.log(`  Health:       http://${config.host}:${config.port}/api/health`);
    console.log('');

    // Check service status
    const groqOk = await checkGroqHealth();
    const ollama = await checkOllamaHealth();

    console.log('  Service Status:');
    console.log(`  Groq API:     ${groqOk ? '✓ Connected' : '✗ Not configured or unavailable'}`);
    console.log(
      `  Ollama:       ${ollama.running ? (ollama.modelLoaded ? '✓ Ready' : '⚠ Running but model not loaded') : '✗ Not running'}`
    );
    console.log(`  whisper.cpp:  Available (fallback)`);
    console.log('');

    if (!groqOk) {
      console.log('  ⚠ Set GROQ_API_KEY in .env to enable Groq Whisper API');
    }
    if (!ollama.running) {
      console.log('  ⚠ Start Ollama with: ollama serve');
    }
    if (ollama.running && !ollama.modelLoaded) {
      console.log(`  ⚠ Pull model with: ollama pull ${config.ollamaModel}`);
    }
    console.log('');
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
