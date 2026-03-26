import { useEffect, useRef, useState } from "react";
import { useRive } from "@rive-app/react-canvas";
import { useElevenLabs } from "../hooks/useElevenLabs";

const src = new URL("../../../assets/avatar.riv", import.meta.url).href;

export default function AvatarPanel({ conversationState, textToSpeak }) {
  console.log("[AvatarPanel] conversationState:", conversationState);

  const { rive, RiveComponent } = useRive({
    src,
    autoplay: true
  });
  const { speak, stop, isSpeaking, amplitudeRef } = useElevenLabs();
  const [visualAmplitude, setVisualAmplitude] = useState(0);
  const lastSpokenTextRef = useRef("");
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    const markInteracted = () => {
      hasUserInteractedRef.current = true;
    };

    window.addEventListener("pointerdown", markInteracted, { once: true });
    window.addEventListener("keydown", markInteracted, { once: true });

    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  useEffect(() => {
    if (!rive) return;
    console.log("[Rive] stateMachineNames:", rive.stateMachineNames);
    console.log("[Rive] animationNames:", rive.animationNames);
  }, [rive]);

  useEffect(() => {
    if (!textToSpeak || textToSpeak === lastSpokenTextRef.current) {
      return;
    }

    if (!hasUserInteractedRef.current) {
      lastSpokenTextRef.current = textToSpeak;
      console.log("[AvatarPanel] skipping auto TTS until first user interaction");
      return;
    }

    lastSpokenTextRef.current = textToSpeak;
    console.log("[AvatarPanel] triggering ElevenLabs speak for text length:", textToSpeak.length);
    void speak(textToSpeak);
  }, [speak, textToSpeak]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  useEffect(() => {
    let frame = 0;

    const tick = () => {
      setVisualAmplitude(amplitudeRef.current);
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [amplitudeRef]);

  useEffect(() => {
    if (!rive) return;

    const animationMap = {
      idle: "idle",
      listening: "Listening",
      thinking: "idle",
      speaking: "Speaking",
      react_positive: "Speaking",
      react_negative: "idle"
    };

    const animationName = animationMap[isSpeaking ? "speaking" : conversationState] || "idle";

    if (conversationState === "listening") {
      console.log("[AvatarPanel] LISTENING TRIGGERED — animation:", animationName);
    }

    try {
      rive.stop();
      rive.play(animationName);
      console.log("[AvatarPanel] playing animation for:", conversationState, animationName);
    } catch (error) {
      console.warn("[AvatarPanel] could not play animation for:", conversationState, error);
    }
  }, [conversationState, isSpeaking, rive]);

  const glowMap = {
    idle: "0 0 24px 4px rgba(150,150,150,0.4)",
    listening: "0 0 24px 4px rgba(59,130,246,0.6)",
    thinking: "0 0 24px 4px rgba(234,179,8,0.6)",
    speaking: "0 0 24px 4px rgba(34,197,94,0.6)",
    react_positive: "0 0 24px 4px rgba(34,197,94,0.8)",
    react_negative: "0 0 24px 4px rgba(239,68,68,0.6)"
  };

  const glowColor = glowMap[conversationState] ?? glowMap.idle;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          width: 300,
          height: 400,
          borderRadius: 16,
          boxShadow: glowColor,
          transition: "box-shadow 0.4s ease",
          overflow: "hidden",
          background: "#ffffff"
        }}
      >
        <RiveComponent />
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 60,
            width: `${18 + visualAmplitude * 30}px`,
            height: `${18 + visualAmplitude * 30}px`,
            transform: "translateX(-50%)",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.2)",
            boxShadow: glowColor,
            transition: "width 0.08s linear, height 0.08s linear, box-shadow 0.2s ease"
          }}
        />
      </div>
      <div style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>{conversationState}</div>
    </div>
  );
}
