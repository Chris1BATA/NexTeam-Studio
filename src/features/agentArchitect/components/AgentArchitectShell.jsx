import { useEffect, useRef, useState } from "react";
import { streamInterviewerTurn, extractPatch } from "../services/architectApi";
import { applyAgentPatch } from "../services/firestoreSession";
import AvatarPanel from "./AvatarPanel";
import { Composer } from "./Composer";
import SpecReviewPanel from "./SpecReviewPanel";
import { AVATAR_STATES } from "../constants/avatarStates";
import { useAgentArchitectSelector, useAgentArchitectSession } from "../hooks/useAgentArchitectSession";
import { unlockAudio, useElevenLabs } from "../hooks/useElevenLabs";

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/#{1,6}\s/g, "");
}

const shellStyles = {
  page: {
    display: "flex",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "sans-serif"
  },
  layout: {
    display: "flex",
    gap: "24px",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: "1224px"
  },
  container: {
    width: "100%",
    maxWidth: "900px",
    border: "1px solid #d0d7de",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  title: {
    margin: 0
  },
  status: {
    fontSize: "14px",
    color: "#57606a"
  },
  messages: {
    border: "1px solid #d0d7de",
    borderRadius: "8px",
    padding: "12px",
    minHeight: "360px",
    maxHeight: "480px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#f6f8fa"
  },
  bubbleRow: {
    display: "flex"
  },
  bubble: {
    maxWidth: "75%",
    padding: "10px 12px",
    borderRadius: "10px",
    whiteSpace: "pre-wrap"
  },
  assistantBubble: {
    background: "#ffffff",
    border: "1px solid #d0d7de"
  },
  userBubble: {
    background: "#dbeafe",
    border: "1px solid #93c5fd",
    marginLeft: "auto"
  },
  patchPreview: {
    margin: 0,
    padding: "12px",
    borderRadius: "8px",
    background: "#0d1117",
    color: "#e6edf3",
    fontSize: "12px",
    overflowX: "auto"
  },
  splashOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "#0A0A14",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999
  },
  splashBrand: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 40
  },
  splashTitle: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: 800,
    marginTop: 24,
    marginBottom: 8
  },
  splashSubtitle: {
    color: "#9CA3AF",
    fontSize: 18,
    marginBottom: 48
  },
  splashButton: {
    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
    color: "#ffffff",
    fontSize: 18,
    fontWeight: 600,
    padding: "18px 48px",
    borderRadius: 50,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 0 40px rgba(79,70,229,0.5)",
    transition: "opacity 0.2s ease, transform 0.2s ease"
  }
};

export function AgentArchitectShell() {
  const { actorRef, send } = useAgentArchitectSession();
  const machineAvatarState = useAgentArchitectSelector(actorRef, (snapshot) => snapshot.context.avatarState);
  const machineState = useAgentArchitectSelector(actorRef, (snapshot) => snapshot.value);
  const { pushChunk, flushBuffer, stop, speakGreeting, isSpeaking, amplitudeRef, currentTimeRef } = useElevenLabs();
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isStartHovered, setIsStartHovered] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [draftPatch, setDraftPatch] = useState({});
  const [currentStage, setCurrentStage] = useState("name");
  const [latestAssistantText, setLatestAssistantText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const hasBootstrappedRef = useRef(false);
  const chatContainerRef = useRef(null);

  const avatarState =
    isStreaming || streamingText
      ? AVATAR_STATES.SPEAKING
      : machineAvatarState || AVATAR_STATES.IDLE;

  useEffect(() => {
    send({ type: "BOOT" });
    setSessionId(crypto.randomUUID());
    setAgentId(crypto.randomUUID());
  }, [send]);

  useEffect(() => {
    if (!voiceEnabled || !sessionId || !agentId || hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;
    send({ type: "BOOT_SUCCESS" });
    send({ type: "READY_FOR_INPUT" });
  }, [voiceEnabled, sessionId, agentId, send]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  async function handleStartConversation() {
    const greetingText = stripMarkdown(
      "Hey there! I'm Nexi, your AI operations consultant at NexTeam-Studio. I help field service businesses build AI agents that run their day-to-day operations. Let's start with the basics — what's your business called?";
    );

    setVoiceEnabled(true);
    unlockAudio();
    setMessages([
      {
        role: "assistant",
        content: greetingText
      }
    ]);
    setLatestAssistantText(greetingText);

    await new Promise((resolve) => setTimeout(resolve, 300));
    await speakGreeting(greetingText);
  }

  async function sendTurn(rawInput, shouldAppendUserMessage = true) {
    const trimmedInput = rawInput.trim();
    const userMessage = {
      role: "user",
      content: trimmedInput
    };

    const nextMessages = shouldAppendUserMessage ? [...messages, userMessage] : messages;

    if (shouldAppendUserMessage) {
      setMessages(nextMessages);
    }

    setErrorMessage("");
    setIsStreaming(true);
    setStreamingText("");
    send({ type: "SUBMIT_TURN" });

    let assistantText = "";

    await streamInterviewerTurn(
      shouldAppendUserMessage
        ? nextMessages
        : [{ role: "user", content: "Hello, I am ready to build an agent." }],
      (delta) => {
        if (!assistantText) {
          send({ type: "TURN_ACCEPTED" });
        }

        const cleanDelta = stripMarkdown(delta);

        assistantText += cleanDelta;
        pushChunk(cleanDelta);
        setStreamingText((current) => current + cleanDelta);
      },
      async () => {
        const COMPLETION_PHRASES = [
          "give me a moment while i put it together",
          "give me a moment while i put this together",
          "i have everything i need to build"
        ];
        const assembledText = stripMarkdown(assistantText);
        const lowerText = assembledText.toLowerCase();
        const assistantIndicatedCompletion = COMPLETION_PHRASES.some((phrase) => lowerText.includes(phrase));

        await flushBuffer();

        const assistantMessage = {
          role: "assistant",
          content: assembledText
        };
        const transcript = [...nextMessages, assistantMessage];

        setMessages(transcript);
        setLatestAssistantText(assembledText);
        setStreamingText("");
        setIsStreaming(false);
        send({ type: "STREAM_COMPLETE" });

        const extracted = await extractPatch(transcript);

        if (!extracted) {
          send({ type: "READY_FOR_INPUT" });
          return;
        }

        send({ type: "PATCH_EXTRACTED" });
        setCurrentStage(extracted.stage || "name");
        setDraftPatch((current) => ({
          ...current,
          ...(extracted.patch || {})
        }));

        await applyAgentPatch(
          agentId,
          sessionId,
          extracted.patch || {},
          extracted.stage || "name",
          extracted.missingFields || []
        );

        if (assistantIndicatedCompletion || extracted.isComplete) {
          send({ type: "READY_TO_REVIEW" });
          send({ type: "COMPLETE" });
        } else {
          send({ type: "PATCH_PERSISTED" });
          send({ type: "READY_FOR_INPUT" });
        }
      },
      (error) => {
        console.error(error);
        setStreamingText("");
        setIsStreaming(false);
        setErrorMessage(error?.message || "Something went wrong while contacting Claude.");
        send({ type: "STREAM_FAILURE" });
      }
    );
  }

  async function handleSend(text) {
    if (!text?.trim() || isStreaming) {
      return;
    }

    await sendTurn(text, true);
  }

  if (!voiceEnabled) {
    return (
      <>
        <div style={shellStyles.splashOverlay}>
          <div style={shellStyles.splashBrand}>NexTeam-Studio</div>
          <AvatarPanel
            conversationState={AVATAR_STATES.IDLE}
            spokenText=""
            isSpeaking={false}
            amplitudeRef={{ current: 0 }}
            currentTimeRef={{ current: 0 }}
            width={200}
            height={280}
            showGlow={false}
            showDebugLabel={false}
            showWordHighlight={false}
          />
          <div style={shellStyles.splashTitle}>Meet Nexi</div>
          <div style={shellStyles.splashSubtitle}>Your AI operations consultant</div>
          <button
            type="button"
            onClick={() => void handleStartConversation()}
            onMouseEnter={() => setIsStartHovered(true)}
            onMouseLeave={() => setIsStartHovered(false)}
            style={{
              ...shellStyles.splashButton,
              opacity: isStartHovered ? 0.9 : 1,
              transform: isStartHovered ? "scale(1.02)" : "scale(1)"
            }}
          >
            Start Conversation →
          </button>
        </div>
      </>
    );
  }

  return (
    <div style={shellStyles.page}>
      <div style={shellStyles.layout}>
        <AvatarPanel
          conversationState={avatarState || AVATAR_STATES.IDLE}
          spokenText={latestAssistantText}
          isSpeaking={isSpeaking}
          amplitudeRef={amplitudeRef}
          currentTimeRef={currentTimeRef}
        />

        {machineState === "completed" ? (
          <SpecReviewPanel agentSpec={draftPatch} />
        ) : (
          <div style={shellStyles.container}>
            <h1 style={shellStyles.title}>Agent Architect Studio - Phase 3 live conversation</h1>
            <div style={shellStyles.status}>
              Current stage: {currentStage} | Avatar state: {avatarState || AVATAR_STATES.IDLE}
            </div>

            <div ref={chatContainerRef} style={shellStyles.messages}>
              {errorMessage ? (
                <div style={{ color: "#b42318", fontSize: "14px" }}>{errorMessage}</div>
              ) : null}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    ...shellStyles.bubbleRow,
                    justifyContent: message.role === "user" ? "flex-end" : "flex-start"
                  }}
                >
                  <div
                    style={{
                      ...shellStyles.bubble,
                      ...(message.role === "user" ? shellStyles.userBubble : shellStyles.assistantBubble)
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isStreaming && streamingText ? (
                <div style={{ ...shellStyles.bubbleRow, justifyContent: "flex-start" }}>
                  <div style={{ ...shellStyles.bubble, ...shellStyles.assistantBubble }}>{streamingText}</div>
                </div>
              ) : null}
            </div>

            <Composer
              onSend={(text) => handleSend(text)}
              isSpeaking={isSpeaking}
              onBarge={() => stop()}
            />

          </div>
        )}
      </div>
    </div>
  );
}
