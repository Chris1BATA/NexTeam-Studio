import { useEffect, useRef, useState } from "react";
import { streamInterviewerTurn, extractPatch } from "../services/architectApi";
import { applyAgentPatch } from "../services/firestoreSession";
import AvatarPanel from "./AvatarPanel";
import { AVATAR_STATES } from "../constants/avatarStates";
import { useAgentArchitectSelector, useAgentArchitectSession } from "../hooks/useAgentArchitectSession";

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
  composer: {
    display: "flex",
    gap: "8px"
  },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d0d7de"
  },
  button: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #d0d7de",
    background: "#ffffff",
    cursor: "pointer"
  },
  patchPreview: {
    margin: 0,
    padding: "12px",
    borderRadius: "8px",
    background: "#0d1117",
    color: "#e6edf3",
    fontSize: "12px",
    overflowX: "auto"
  }
};

export function AgentArchitectShell() {
  const { actorRef, send } = useAgentArchitectSession();
  const machineAvatarState = useAgentArchitectSelector(actorRef, (snapshot) => snapshot.context.avatarState);
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [draftPatch, setDraftPatch] = useState({});
  const [currentStage, setCurrentStage] = useState("name");
  const [latestAssistantText, setLatestAssistantText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const hasBootstrappedRef = useRef(false);

  const avatarState =
    isStreaming || streamingText
      ? AVATAR_STATES.SPEAKING
      : isComposerFocused || input.trim()
        ? AVATAR_STATES.LISTENING
        : machineAvatarState || AVATAR_STATES.IDLE;

  useEffect(() => {
    send({ type: "BOOT" });
    setSessionId(crypto.randomUUID());
    setAgentId(crypto.randomUUID());
  }, [send]);

  useEffect(() => {
    if (!sessionId || !agentId || hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;
    send({ type: "BOOT_SUCCESS" });
    void sendTurn("Hello, I am ready to build an agent.", false);
  }, [sessionId, agentId, send]);

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

        assistantText += delta;
        setStreamingText((current) => current + delta);
      },
      async () => {
        const assistantMessage = {
          role: "assistant",
          content: assistantText
        };
        const transcript = [...nextMessages, assistantMessage];

        setMessages(transcript);
        setLatestAssistantText(assistantText);
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

        if (extracted.isComplete) {
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

  async function handleSend() {
    if (!input.trim() || isStreaming) {
      return;
    }

    const nextInput = input;
    setInput("");
    await sendTurn(nextInput, true);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div style={shellStyles.page}>
      <div style={shellStyles.layout}>
        <AvatarPanel
          conversationState={avatarState || AVATAR_STATES.IDLE}
          textToSpeak={latestAssistantText}
        />

        <div style={shellStyles.container}>
          <h1 style={shellStyles.title}>Agent Architect Studio - Phase 3 live conversation</h1>
          <div style={shellStyles.status}>
            Current stage: {currentStage} | Avatar state: {avatarState || AVATAR_STATES.IDLE}
          </div>

          <div style={shellStyles.messages}>
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

          <div style={shellStyles.composer}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => setIsComposerFocused(true)}
              onBlur={() => setIsComposerFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              style={shellStyles.input}
            />
            <button type="button" onClick={() => void handleSend()} disabled={isStreaming} style={shellStyles.button}>
              Send
            </button>
          </div>

          <pre style={shellStyles.patchPreview}>{JSON.stringify(draftPatch, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
