# V1 Voice Demo Test

V1 Voice Demo Test is a dark, browser-based multimodal assistant interface for experimenting with voice, text, and image inputs. It can capture speech, display a live transcript, accept typed messages and image attachments, and read responses aloud using the voices available on the user's device.

## Live Demo

[Open V1 Voice Demo Test](https://nova-voice-demo.jwlachman.chatgpt.site)

## Features

- Browser microphone input with live speech transcription
- Selectable text-to-speech voices
- Typed-message composer with Enter-to-send support
- Image picker and drag-and-drop attachments
- Image previews, attachment removal, and basic validation
- Responsive dark interface for desktop and mobile
- Keyboard shortcut for starting voice input
- Session-only interactions with no application-level audio or image storage

## Current Scope

This project is a frontend demonstration. Assistant replies currently use local demo logic. Image files are attached to the conversation interface, but genuine image understanding requires connecting a vision-capable AI model and a secure server-side API.

## Browser Support

Voice recognition works best in current versions of Google Chrome and Microsoft Edge. Microphone access must be allowed when the browser requests permission. Text messaging and image attachments work in other modern browsers.

## Getting Started

### Requirements

- Node.js 22.13 or newer
- pnpm

### Install and run

```bash
pnpm install
pnpm dev
```

Open the local address printed in the terminal.

### Production build

```bash
pnpm build
```

## Project Structure

- `app/page.tsx` contains the voice, messaging, and image attachment interactions.
- `app/globals.css` contains the responsive dark-theme design.
- `app/layout.tsx` contains page and social-sharing metadata.
- `public/og.png` is the social-preview image.
- `.openai/hosting.json` contains the Sites deployment configuration.

## Privacy

The demo does not add application-level storage for microphone recordings or image attachments. Browser speech-recognition services may process audio according to the browser vendor's own policies.
