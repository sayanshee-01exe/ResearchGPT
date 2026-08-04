import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function getConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Dictation via the browser's Web Speech API. Nothing is uploaded to our
 * backend — the browser does the transcription and we only receive text.
 */
export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const [supported] = useState(() => getConstructor() !== null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    const Constructor = getConstructor();
    if (!Constructor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Constructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event: any) => {
      // `event.results` is cumulative — it re-sends every segment from the
      // session each time. Only the entries from `resultIndex` onward are new,
      // so joining the whole list would repeat words already committed.
      const start = typeof event.resultIndex === "number" ? event.resultIndex : 0;
      let fresh = "";
      for (let i = start; i < event.results.length; i++) {
        const result = event.results[i];
        // Interim guesses get revised; only commit finalized speech.
        if (!result?.isFinal) continue;
        fresh += result[0]?.transcript ?? "";
      }
      fresh = fresh.replace(/\s+/g, " ").trim();
      if (fresh) callbackRef.current(fresh);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  return { supported, listening, toggle };
}
