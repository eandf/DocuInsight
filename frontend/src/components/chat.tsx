"use client";

import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ArrowUp } from "lucide-react";
import { ComponentPropsWithoutRef } from "react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
}

/** A bubble that displays chat text */
const ChatMessage: React.FC<Message> = ({ content, role }) => (
  <div
    className={`group flex items-start gap-4 ${
      role === "user" ? "flex-row-reverse" : ""
    }`}
  >
    {role === "assistant" && (
      <Avatar className="h-8 w-8 border border-border">
        <AvatarImage />
        <AvatarFallback className="bg-muted text-muted-foreground">
          AI
        </AvatarFallback>
      </Avatar>
    )}
    <div className="flex-1">
      <div
        className={`flex items-start gap-4 ${
          role === "user" ? "flex-row-reverse" : ""
        }`}
      >
        <div
          className={`relative rounded-xl px-3 py-1 max-w-[80%] shadow-sm ${
            role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
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
                <a href={href} className="text-blue-500 hover:underline">
                  {children}
                </a>
              ),
              code: ({
                inline,
                children,
              }: ComponentPropsWithoutRef<"code"> & {
                inline?: boolean;
              }) =>
                inline ? (
                  <code className="bg-gray-200 rounded px-1">{children}</code>
                ) : (
                  <pre className="bg-gray-200 rounded p-2 overflow-x-auto">
                    <code>{children}</code>
                  </pre>
                ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  </div>
);

export default function ChatPage() {
  const [sessionId, setSessionId] = React.useState<string>("");
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "assistant-1",
      content: "Hello! How can I assist you today?",
      role: "assistant",
    },
  ]);
  const [input, setInput] = React.useState("");

  // On mount, get or generate a sessionId
  React.useEffect(() => {
    let existingId = localStorage.getItem("myChatSessionId");
    if (!existingId) {
      existingId = uuidv4();
      localStorage.setItem("myChatSessionId", existingId);
    }
    setSessionId(existingId);
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

    // 4) Call our server route and stream response
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput: userText,
        }),
      });
      if (!res.ok || !res.body) {
        console.error("API error:", res.statusText);
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

          // Optional: Log partial chunks for debugging
          console.log("Partial chunk:", chunk);
        }
      }

      // Optional: Log the complete message
      console.log(
        "Assistant message complete:",
        messages.find((msg) => msg.id === assistantId)?.content
      );
    } catch (error) {
      console.error("Fetch error:", error);
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
      {/* Chat messages */}
      <div className="overflow-hidden flex-1">
        <div className="h-full overflow-y-auto px-4 py-4 space-y-4 chat-messages-container">
          {messages.map((m) => (
            <ChatMessage key={m.id} {...m} />
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
