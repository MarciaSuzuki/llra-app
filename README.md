# Learning Level Readiness Assessment
### University of the Nations · YWAM

A full-stack web application for assessing prospective graduate students using Revised Bloom's Taxonomy (Remember, Understand, Apply). Supports both **text** and **voice/audio** interaction — designed for candidates from oral cultures who may prefer to speak their answers aloud.

## Features

- 🎙 **Full audio mode** — questions are read aloud, answers captured by microphone
- ⌨ **Text mode** — traditional chat-based interface
- 🔄 **Mode toggle** — switch between audio and text at any time
- 🤖 **Three-agent AI system** — Assessment, Evaluation, and Report agents
- 📊 **Admin dashboard** — view all sessions, scores, and AI-generated notes
- 📱 **Mobile friendly** — works on phone browsers, no download required

## Tech Stack

- **Framework**: Next.js 14
- **AI**: Anthropic Claude (claude-sonnet-4)
- **Audio**: Web Speech API (browser-native, no extra API keys)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Setup

See `DEPLOYMENT.md` for complete step-by-step instructions.

```bash
npm install
cp .env.example .env.local
# Fill in your values in .env.local
npm run dev
```

## Assessment Structure

| Level | Questions | Stories |
|-------|-----------|---------|
| Remember | 10 | Story A |
| Understand | 10 | Story A |
| Apply | 10 | Both stories |

**Total**: 30 questions · 60 points maximum

## Audio Mode Notes

Requires Chrome or Edge for full microphone support. Uses:
- `SpeechRecognition` API for voice input
- `SpeechSynthesis` API for voice output

No third-party audio services required.
