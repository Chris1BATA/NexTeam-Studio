import { useCallback, useRef, useState } from "react";
import { speakText, stopSpeaking } from "../services/elevenLabsService";

export function useElevenLabs() {
  const amplitudeRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text) => {
    if (!text) {
      return;
    }

    setIsSpeaking(true);
    amplitudeRef.current = 0;

    try {
      await speakText(
        text,
        (amplitude) => {
          amplitudeRef.current = amplitude;
        },
        () => {
          amplitudeRef.current = 0;
          setIsSpeaking(false);
        }
      );
    } catch (err) {
      amplitudeRef.current = 0;
      setIsSpeaking(false);
      console.warn("[useElevenLabs] speak failed silently:", err);
    }
  }, []);

  const stop = useCallback(async () => {
    amplitudeRef.current = 0;
    setIsSpeaking(false);
    await stopSpeaking();
  }, []);

  return { speak, stop, isSpeaking, amplitudeRef };
}
