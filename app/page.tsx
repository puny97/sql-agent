"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const suggestions = [
  {
    title: "Sales overview",
    prompt: "Give me a summary of today's sales",
    icon: "↗",
  },
  {
    title: "Top products",
    prompt: "Which products have the highest sales revenue?",
    icon: "◇",
  },
  {
    title: "Regional trends",
    prompt: "Compare sales performance across regions",
    icon: "⌖",
  },
  {
    title: "Low stock",
    prompt: "Which products are running low on stock?",
    icon: "▤",
  },
];

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

function isToolPart(part: UIMessage["parts"][number]): part is ToolPart {
  return part.type.startsWith("tool-");
}

function getQuery(input: unknown) {
  if (typeof input !== "object" || input === null || !("query" in input)) {
    return undefined;
  }

  return typeof input.query === "string" ? input.query : undefined;
}

function getRowCount(output: unknown) {
  if (typeof output !== "object" || output === null) return undefined;
  if ("rows" in output && Array.isArray(output.rows)) return output.rows.length;
  if ("rowCount" in output && typeof output.rowCount === "number") {
    return output.rowCount;
  }
  if ("rowsAffected" in output && typeof output.rowsAffected === "number") {
    return output.rowsAffected;
  }
  return undefined;
}

function toolLabel(type: string) {
  if (type === "tool-db") return "Database query";
  if (type === "tool-schema") return "Database schema";
  return type.replace(/^tool-/, "").replaceAll("-", " ");
}

function MarkdownResponse({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="markdown-table-wrap">
              <table {...props}>{children}</table>
            </div>
          ),
          a: ({ children, href, ...props }) => (
            <a href={href} target="_blank" rel="noreferrer" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ToolActivity({ part }: { part: ToolPart }) {
  const label = toolLabel(part.type);
  const query = getQuery(part.input);
  const rowCount =
    part.state === "output-available" ? getRowCount(part.output) : undefined;
  const isError = part.state === "output-error";
  const isComplete = part.state === "output-available";

  return (
    <details
      className={`tool-activity${isError ? " tool-activity-error" : ""}`}
    >
      <summary>
        <span className="tool-activity-icon" aria-hidden="true">
          {isError ? "!" : isComplete ? "✓" : "↻"}
        </span>
        <span className="tool-activity-title">{label}</span>
        <span className="tool-activity-status">
          {isError
            ? "Failed"
            : isComplete
              ? rowCount === undefined
                ? "Complete"
                : `${rowCount} ${rowCount === 1 ? "row" : "rows"}`
              : "Working"}
        </span>
        <span className="tool-activity-chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      {(query || part.errorText) && (
        <div className="tool-activity-details">
          {query && <pre>{query}</pre>}
          {part.errorText && <p>{part.errorText}</p>}
        </div>
      )}
    </details>
  );
}

function MessageContent({ message }: { message: UIMessage }) {
  return (
    <div className="message-parts">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return message.role === "assistant" ? (
            <MarkdownResponse
              key={`${message.id}-${index}`}
              content={part.text}
            />
          ) : (
            <p className="user-message-text" key={`${message.id}-${index}`}>
              {part.text}
            </p>
          );
        }

        if (isToolPart(part)) {
          return <ToolActivity key={`${message.id}-${index}`} part={part} />;
        }

        if (part.type === "step-start") {
          return (
            <div className="step-indicator" key={`${message.id}-${index}`}>
              <span className="status-pulse" />
              Working through the next step…
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function Chat() {
  const [input, setInput] = useState("");
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
    setMessages,
  } = useChat();
  const conversationRef = useRef<HTMLDivElement>(null);
  const stickToLatestRef = useRef(true);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation && stickToLatestRef.current) {
      conversation.scrollTo({ top: conversation.scrollHeight });
    }
  }, [messages]);

  function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    clearError();
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Query Studio home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            query<span className="brand-light">studio</span>
          </span>
        </Link>

        <div className="sidebar-section">
          <span className="sidebar-label">YOUR WORKSPACE</span>
          <div className="workspace-card">
            <span className="workspace-icon" aria-hidden="true">
              ▦
            </span>
            <span>
              <strong>Sales database</strong>
              <small>SQLite · 2 tables</small>
            </span>
            <span className="connection-indicator" aria-label="Schema loaded" />
          </div>
        </div>

        <div className="sidebar-section schema-section">
          <span className="sidebar-label">TABLES</span>
          <div className="schema-item">
            <span className="table-icon" aria-hidden="true">
              ▤
            </span>
            <span>products</span>
            <span className="column-count">6</span>
          </div>
          <div className="schema-item">
            <span className="table-icon" aria-hidden="true">
              ▤
            </span>
            <span>sales</span>
            <span className="column-count">7</span>
          </div>
        </div>

        <div className="sidebar-footer">
          <span className="avatar">DB</span>
          <span>
            <strong>Sales workspace</strong>
            <small>AI-powered data chat</small>
          </span>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="topbar">
          <div className="topbar-title">
            <span className="mobile-brand-mark" aria-hidden="true">
              ▦
            </span>
            <span>
              {messages.length ? "SQL assistant" : "New conversation"}
            </span>
            <span className="topbar-divider">/</span>
            <span className="topbar-database">Sales database</span>
          </div>
          <div className="topbar-actions">
            <span className="model-badge">
              <span /> AI assistant
            </span>
          </div>
        </header>

        <div
          ref={conversationRef}
          className={`conversation${messages.length === 0 ? " conversation-empty" : ""}`}
          onScroll={(event) => {
            const element = event.currentTarget;
            stickToLatestRef.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              120;
          }}
        >
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon" aria-hidden="true">
                <span>✳</span>
              </div>
              <p className="welcome-eyebrow">YOUR DATA, IN PLAIN LANGUAGE</p>
              <h1>
                What would you like
                <br />
                to know?
              </h1>
              <p className="welcome-description">
                Ask a question about your sales data. I’ll query your database
                and turn the results into a clear answer.
              </p>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button
                    className="suggestion-card"
                    key={suggestion.title}
                    type="button"
                    onClick={() => submitMessage(suggestion.prompt)}
                  >
                    <span className="suggestion-icon" aria-hidden="true">
                      {suggestion.icon}
                    </span>
                    <span>
                      <strong>{suggestion.title}</strong>
                      <small>{suggestion.prompt}</small>
                    </span>
                    <span className="suggestion-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article
                  className={`message-row message-${message.role}`}
                  key={message.id}
                >
                  {message.role === "assistant" && (
                    <div className="assistant-avatar" aria-hidden="true">
                      ✳
                    </div>
                  )}
                  <div className="message-column">
                    {message.role === "assistant" && (
                      <div className="message-author">
                        Query Studio <span>AI assistant</span>
                      </div>
                    )}
                    <MessageContent message={message} />
                  </div>
                </article>
              ))}
              {isBusy &&
                !messages[messages.length - 1]?.parts.some(
                  (part) => part.type === "step-start",
                ) && (
                  <div
                    className="typing-indicator"
                    role="status"
                    aria-label="Thinking"
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              {error && (
                <div className="error-banner" role="alert">
                  <span>
                    {error.message || "Something went wrong. Please try again."}
                  </span>
                  <button type="button" onClick={clearError}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="composer-area">
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              submitMessage(input);
            }}
          >
            <textarea
              aria-label="Ask a question about your database"
              value={input}
              placeholder="Ask anything about your data…"
              rows={1}
              onChange={(event) => setInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage(input);
                }
              }}
              disabled={isBusy}
            />
            <div className="composer-toolbar">
              <span className="composer-hint">
                <span className="composer-sparkle" aria-hidden="true">
                  ✳
                </span>
                Answers grounded in your database
              </span>
              {isBusy ? (
                <button
                  className="send-button stop-button"
                  type="button"
                  onClick={stop}
                  aria-label="Stop generating"
                >
                  <span />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Send message"
                >
                  ↑
                </button>
              )}
            </div>
          </form>
          <p className="composer-disclaimer">
            AI can make mistakes. Review important data before making decisions.
          </p>
        </div>
      </section>
    </main>
  );
}
