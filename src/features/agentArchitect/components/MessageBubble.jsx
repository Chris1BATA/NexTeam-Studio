const bubbleStyles = {
  row: {
    display: "flex"
  },
  bubble: {
    maxWidth: "75%",
    padding: "10px 12px",
    borderRadius: "10px",
    whiteSpace: "pre-wrap",
    lineHeight: 1.5,
    fontSize: 14
  },
  assistant: {
    background: "#ffffff",
    border: "1px solid #d0d7de",
    color: "#111827"
  },
  user: {
    background: "#dbeafe",
    border: "1px solid #93c5fd",
    color: "#111827"
  }
};

export function MessageBubble({ role = "assistant", content = "", isStreaming = false }) {
  const isUser = role === "user";

  return (
    <div style={{ ...bubbleStyles.row, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          ...bubbleStyles.bubble,
          ...(isUser ? bubbleStyles.user : bubbleStyles.assistant),
          opacity: isStreaming ? 0.9 : 1
        }}
      >
        {content}
      </div>
    </div>
  );
}
