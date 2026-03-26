import { useEffect } from "react";
import { useRive } from "@rive-app/react-canvas";

const src = new URL("../../../assets/avatar.riv", import.meta.url).href;

export default function AvatarPanel({ conversationState }) {
  console.log("[AvatarPanel] conversationState:", conversationState);

  const { rive, RiveComponent } = useRive({
    src,
    autoplay: true
  });

  useEffect(() => {
    if (!rive) return;
    console.log("[Rive] stateMachineNames:", rive.stateMachineNames);
    console.log("[Rive] animationNames:", rive.animationNames);
  }, [rive]);

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

    const animationName = animationMap[conversationState] || "idle";

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
  }, [conversationState, rive]);

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
    <div>
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
      </div>
      <div style={{ color: "#aaa", fontSize: 12, textAlign: "center" }}>{conversationState}</div>
    </div>
  );
}
