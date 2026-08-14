"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionEventLike = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type SpeechRecognitionErrorEventLike = { error: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type RecognitionConstructor = new () => SpeechRecognitionLike;

type ImageAttachment = {
  id: string;
  name: string;
  url: string;
};

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

const suggestions = [
  "Plan my afternoon",
  "Summarize my idea",
  "Help me write a message",
];

function createAssistantReply(input: string, imageCount = 0) {
  const text = input.trim();
  const lower = text.toLowerCase();

  if (imageCount > 0) {
    const imageLabel = imageCount === 1 ? "image" : "images";
    if (!text) return `I received ${imageCount} ${imageLabel}. The preview is ready for visual review in this demo.`;
    return `I received your message and ${imageCount} ${imageLabel}. The attachment is included with your prompt and ready for V1's vision connection.`;
  }
  if (!text) return "I did not catch that. Try speaking again, a little closer to your microphone.";
  if (lower.includes("afternoon") || lower.includes("plan my day")) {
    return "Let us keep it focused: choose one important task, protect a 60-minute work block, then leave 15 minutes to reset and plan tomorrow.";
  }
  if (lower.includes("summarize")) {
    return `Here is the short version: ${text.replace(/summarize/gi, "").trim() || "share your idea and I will turn it into a clear takeaway."}`;
  }
  if (lower.includes("message") || lower.includes("email")) {
    return "Absolutely. Lead with the reason you are reaching out, keep the middle to one clear request, and end with a specific next step.";
  }
  if (lower.includes("time")) {
    return `It is ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date())}.`;
  }
  return `I heard you say: "${text}". A useful next step is to turn that into one small action you can finish in the next 20 minutes.`;
}

async function toAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      url: String(reader.result),
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [reply, setReply] = useState("Hi, I am V1. Speak, type, or attach an image to get started.");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [sentAttachments, setSentAttachments] = useState<ImageAttachment[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState("Ready when you are");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis?.getVoices() ?? [];
      const english = available.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
      const nextVoices = english.length ? english : available;
      setVoices(nextVoices);
      setVoiceName((current) => current || nextVoices[0]?.name || "");
    };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices.find((voice) => voice.name === voiceName) || null;
    utterance.rate = 0.98;
    utterance.pitch = 1.02;
    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus("V1 is speaking");
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus("Ready when you are");
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus("Audio playback was interrupted");
    };
    window.speechSynthesis.speak(utterance);
  }, [voiceName, voices]);

  const answer = useCallback((input: string, imageCount = 0) => {
    const nextReply = createAssistantReply(input, imageCount);
    setReply(nextReply);
    setHasInteracted(true);
    speak(nextReply);
  }, [speak]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const startListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus("Voice input works best in Chrome or Edge");
      return;
    }

    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setTranscript("");
    setInterim("");
    setSentAttachments([]);

    recognition.onresult = (event) => {
      let finalText = finalTranscriptRef.current;
      let interimText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        const phrase = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${phrase} `;
        else interimText += phrase;
      }
      finalTranscriptRef.current = finalText;
      interimTranscriptRef.current = interimText;
      setTranscript(finalText.trim());
      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? "Microphone access is needed to listen"
        : event.error === "no-speech"
          ? "I did not hear anything - try again"
          : "Something interrupted the microphone";
      setStatus(message);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const completed = `${finalTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
      if (completed) {
        setTranscript(completed);
        setInterim("");
        setStatus("Thinking...");
        window.setTimeout(() => answer(completed), 450);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      setStatus("Listening...");
    } catch {
      setStatus("The microphone is already active");
    }
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.code !== "Space" || ["SELECT", "BUTTON", "TEXTAREA", "INPUT"].includes(target.tagName)) return;
      event.preventDefault();
      startListening();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  const addImages = async (files: File[]) => {
    const valid = files.filter((file) => file.type.startsWith("image/") && file.size <= 8 * 1024 * 1024);
    if (valid.length !== files.length) setStatus("Use image files under 8 MB");
    const room = Math.max(0, 3 - attachments.length);
    const next = await Promise.all(valid.slice(0, room).map(toAttachment));
    setAttachments((current) => [...current, ...next].slice(0, 3));
    if (valid.length > room) setStatus("You can attach up to 3 images");
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message && attachments.length === 0) return;
    window.speechSynthesis?.cancel();
    setTranscript(message || "Image attached");
    setInterim("");
    setSentAttachments(attachments);
    setDraft("");
    setAttachments([]);
    setStatus("Thinking...");
    window.setTimeout(() => answer(message, attachments.length), 350);
  };

  const useSuggestion = (text: string) => {
    setTranscript(text);
    setSentAttachments([]);
    setInterim("");
    setStatus("Thinking...");
    window.setTimeout(() => answer(text), 350);
  };

  const assistantBubble = (
    <div className="message assistant-message">
      <span className="message-label">V1</span>
      <p>{reply}</p>
      <button className="replay" onClick={() => speak(reply)} aria-label="Replay V1 response"><span aria-hidden="true">&#9654;</span> Replay</button>
    </div>
  );

  return (
    <main>
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="V1 home">
          <span className="brand-mark" aria-hidden="true">V1</span>
          <span>V1 Voice Demo Test</span>
        </a>
        <div className="nav-right">
          <span className="privacy-pill"><span className="privacy-dot" /> Session only</span>
          <a className="text-link" href="#how">How it works</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span>●</span> Multimodal assistant playground</div>
        <h1>V1 Voice <em>Demo Test</em></h1>
        <p className="lede">Speak it, type it, or show it. Test a flexible assistant interface built for natural conversations.</p>

        <div className={`voice-card ${isListening ? "is-listening" : ""} ${isSpeaking ? "is-speaking" : ""}`}>
          <div className="card-head">
            <div className="assistant-id">
              <div className="avatar" aria-hidden="true">
                <span className="avatar-core">V1</span>
                <i className="orbit orbit-one" />
                <i className="orbit orbit-two" />
              </div>
              <div>
                <strong>V1</strong>
                <span className="live-status"><i /> {status}</span>
              </div>
            </div>
            <label className="voice-select">
              <span>Voice</span>
              <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)} aria-label="Choose V1 voice">
                {voices.length === 0 && <option>System voice</option>}
                {voices.map((voice) => <option key={`${voice.name}-${voice.lang}`} value={voice.name}>{voice.name.replace(/Microsoft|Google/g, "").trim()}</option>)}
              </select>
            </label>
          </div>

          <div className="conversation" aria-live="polite">
            {!hasInteracted && assistantBubble}
            {(transcript || interim) && (
              <div className="message user-message">
                <span className="message-label">YOU</span>
                {sentAttachments.length > 0 && (
                  <div className="sent-images">
                    {sentAttachments.map((image) => <img src={image.url} alt={`Attached preview: ${image.name}`} key={image.id} />)}
                  </div>
                )}
                <p>{transcript} <span className="interim">{interim}</span></p>
              </div>
            )}
            {hasInteracted && assistantBubble}
          </div>

          <div className="wave-wrap" aria-hidden="true">
            <div className="waveform">
              {Array.from({ length: 31 }, (_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}
            </div>
          </div>

          <div className="input-zone">
            <div className="mic-area">
              <button className="mic-button" onClick={startListening} aria-pressed={isListening} aria-label={isListening ? "Stop listening" : "Start listening"}>
                <span className="mic-icon" aria-hidden="true"><i /></span>
              </button>
              <div><strong>{isListening ? "Listening - tap to finish" : "Tap to speak"}</strong><span>{isListening ? "V1 is listening" : "or press the space bar"}</span></div>
            </div>

            <span className="input-divider">OR</span>

            <form
              className={`composer ${isDragging ? "is-dragging" : ""}`}
              onSubmit={submitMessage}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void addImages(Array.from(event.dataTransfer.files));
              }}
            >
              {attachments.length > 0 && (
                <div className="attachment-strip" aria-label="Ready to send images">
                  {attachments.map((image) => (
                    <div className="attachment" key={image.id}>
                      <img src={image.url} alt={image.name} />
                      <button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.id !== image.id))} aria-label={`Remove ${image.name}`}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="composer-row">
                <button className="attach-button" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach images">
                  <span aria-hidden="true">+</span>
                </button>
                <input
                  ref={fileInputRef}
                  className="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    void addImages(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  placeholder="Message V1 or drop an image..."
                  aria-label="Message V1"
                />
                <button className="send-button" type="submit" disabled={!draft.trim() && attachments.length === 0} aria-label="Send message">
                  <span aria-hidden="true">↑</span>
                </button>
              </div>
              <p className="composer-hint">Attach up to 3 images, 8 MB each</p>
            </form>
          </div>
        </div>

        <div className="suggestions" aria-label="Try a suggestion">
          <span>Try asking</span>
          {suggestions.map((suggestion) => <button key={suggestion} onClick={() => useSuggestion(suggestion)}>"{suggestion}"</button>)}
        </div>
      </section>

      <section className="how" id="how">
        <div><span className="section-number">01</span><h2>Speak</h2><p>Use your microphone and watch a live transcript appear.</p></div>
        <div><span className="section-number">02</span><h2>Type</h2><p>Send a message when typing feels faster or more private.</p></div>
        <div><span className="section-number">03</span><h2>Attach</h2><p>Add image previews to give V1 visual context with your prompt.</p></div>
      </section>

      <footer>
        <span>V1 Voice Demo Test</span>
        <p>Your audio and attachments are not stored by this demo.</p>
        <span>Voice + text + vision ready</span>
      </footer>
    </main>
  );
}
