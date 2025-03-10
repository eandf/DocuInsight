"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ArrowUp, ExternalLink } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { v4 as uuidv4 } from "uuid";

// Simple CSS Spinner Component
const Spinner: React.FC = () => (
  <div className="inline-flex space-x-1 ml-2 text-muted-foreground">
    <span className="w-2 h-2 bg-current rounded-full opacity-0 animate-blink animation-delay-0"></span>
    <span className="w-2 h-2 bg-current rounded-full opacity-0 animate-blink animation-delay-200"></span>
    <span className="w-2 h-2 bg-current rounded-full opacity-0 animate-blink animation-delay-400"></span>

    {/* Tailwind CSS Custom Animations */}
    <style jsx>{`
      @keyframes blink {
        0%,
        80%,
        100% {
          opacity: 0;
        }
        40% {
          opacity: 1;
        }
      }

      .animate-blink {
        animation: blink 1.4s infinite both;
      }

      .animation-delay-0 {
        animation-delay: 0s;
      }

      .animation-delay-200 {
        animation-delay: 0.2s;
      }

      .animation-delay-400 {
        animation-delay: 0.4s;
      }
    `}</style>
  </div>
);

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
}

interface ChatMessageProps extends Message {
  loading?: boolean;
}

/** A bubble that displays chat text or a spinner */
const ChatMessage: React.FC<ChatMessageProps> = ({
  content,
  role,
  loading,
}) => {
  const isAssistantLoading =
    role === "assistant" && loading && content.trim() === "";

  return (
    <div
      className={`group flex items-start gap-4 ${
        role === "user" ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar can be re-enabled if needed */}
      {/* {role === "assistant" && (
        <Avatar className="h-10 w-10 border border-border flex items-center justify-center">
          <AvatarImage src="/logo.png" className="w-6 h-6" />
          <AvatarFallback className="bg-muted text-muted-foreground">
            AI
          </AvatarFallback>
        </Avatar>
      )} */}

      <div className="flex-1 min-w-0">
        {isAssistantLoading ? (
          // Render Spinner in place of the message bubble
          <div className="flex items-center">
            <Spinner />
          </div>
        ) : (
          // Render the message bubble
          <div
            className={`flex items-start gap-4 ${
              role === "user" ? "flex-row-reverse" : ""
            } relative`}
          >
            <div
              className={`relative rounded-xl px-3 py-1 max-w-[80%] break-words shadow-sm ${
                role === "user"
                  ? "bg-gray-700 text-gray-100"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 text-current">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-4 mb-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-4 mb-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="mb-1 text-current">{children}</li>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mb-2">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-bold mb-2">{children}</h3>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-blue-600 underline hover:text-blue-800 break-words inline-flex items-center"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                      {/* External link icon for a visual cue */}
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  ),
                  code: ({
                    inline,
                    children,
                  }: ComponentPropsWithoutRef<"code"> & {
                    inline?: boolean;
                  }) =>
                    inline ? (
                      <code className="bg-gray-300 text-gray-900 rounded px-1">
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-gray-300 text-gray-900 rounded p-2 overflow-x-auto">
                        <code>{children}</code>
                      </pre>
                    ),
                }}
                className="break-words whitespace-pre-wrap"
              >
                {/* removing multiple newlines */}
                {content.replace(/\n{2,}/g, "\n")}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Chat({
  contractText,
  finalReport,
}: {
  contractText: string;
  finalReport: string;
}) {
  const [sessionId, setSessionId] = React.useState<string>("");
  const [userLocation, setUserLocation] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "assistant-1",
      content: "Hello! How can I assist you today?",
      role: "assistant",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [isAssistantTyping, setIsAssistantTyping] = React.useState(false);
  const [currentAssistantId, setCurrentAssistantId] = React.useState<
    string | null
  >(null);

  // On mount, get or generate a sessionId
  React.useEffect(() => {
    let existingId = localStorage.getItem("myChatSessionId");
    if (!existingId) {
      existingId = uuidv4();
      localStorage.setItem("myChatSessionId", existingId);
    }
    setSessionId(existingId);
  }, []);

  React.useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // For now, just store lat/long. If you want city/state, you'd
          // need to call a reverse-geocode API from the client or your server.
          setUserLocation(`Lat: ${latitude}, Lon: ${longitude}`);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setUserLocation(null);
        }
      );
    }
  }, []);

  // For auto-scrolling
  const setMessagesEndRef = React.useCallback((node: HTMLDivElement) => {
    if (node) {
      node.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const scrollToBottom = () => {
    const chatContainer = document.querySelector(".chat-messages-container");
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };

  async function handleSend() {
    if (!input.trim() || !sessionId) return;

    // 1) Add user's message to local state
    const userMsg: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
    };
    setMessages((prev) => [...prev, userMsg]);
    const userText = input.trim();

    // 2) Clear input
    setInput("");

    // 3) Create and add assistant's message with empty content
    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      content: "", // Start with empty content
      role: "assistant",
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // Store the assistant message ID for updating
    const assistantId = assistantMsg.id;
    setCurrentAssistantId(assistantId);
    setIsAssistantTyping(true);

    // 4) Call our server route and stream response
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput: userText,
          userLocation,
          contractText: contractText,
          finalReport: finalReport,
        }),
      });
      if (!res.ok || !res.body) {
        console.error("API error:", res.statusText);
        setIsAssistantTyping(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone;
        if (value) {
          // Convert Uint8Array into a string
          const chunk = decoder.decode(value, { stream: true });

          // Update the assistant's message with the new chunk
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: msg.content + chunk }
                : msg
            )
          );
        }
      }

      // Optional: Log the complete message
      const finalMessage = messages.find(
        (msg) => msg.id === assistantId
      )?.content;
      console.log("Assistant message complete:", finalMessage);

      setIsAssistantTyping(false);
      setCurrentAssistantId(null);
    } catch (error) {
      console.error("Fetch error:", error);
      setIsAssistantTyping(false);
      setCurrentAssistantId(null);
    }
  }

  // Scroll to bottom whenever messages change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <div className="flex flex-col w-full h-full">
      <h2 className="pl-4 py-2 font-semibold text-lg border-b">Chat</h2>
      {/* Chat messages */}
      <div className="overflow-hidden flex-1">
        <div className="h-full overflow-y-auto px-4 py-4 space-y-4 chat-messages-container">
          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              {...m}
              loading={isAssistantTyping && m.id === currentAssistantId}
            />
          ))}
          <div ref={setMessagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t-[1.5px] p-4 h-[51px] flex">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2 w-full"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
