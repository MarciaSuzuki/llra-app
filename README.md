# Graduate Readiness Assessment
### University of the Nations · YWAM

A full-stack web application for assessing prospective graduate students using Revised Bloom's Taxonomy (Remember, Understand, Apply). Supports both **text** and **voice/audio** interaction, designed for candidates from oral cultures who may prefer to speak their answers aloud.

## Features

- Story preparation room with readable story layout, replayable narration, and optional notes
- High-quality story/question audio via ElevenLabs
- Text mode and voice-input mode for student answers
- Mode toggle during the assessment
- Three-agent AI system: Assessment, Evaluation, and Report agents
- Admin dashboard for sessions, scores, and AI-generated notes
- Mobile-friendly web experience (no app download)

## Tech Stack

- **Framework**: Next.js 14
- **AI**: Anthropic Claude (claude-sonnet-4)
- **Audio output**: ElevenLabs Text-to-Speech API
- **Audio input**: Browser Web Speech API
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

- Story and question narration uses ElevenLabs.
- Voice answer capture uses `SpeechRecognition` (best support in Chrome/Edge).
- If voice input is not supported by the browser, the app falls back to text input.
