"use client";
import { API_URL } from '@/lib/api';
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, Send, MessageCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSocket } from '../SocketProvider';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  };
}

export default function ChatDrawer({ isOpen, onClose, workspaceId }: ChatDrawerProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  // Fetch initial history
  useEffect(() => {
    if (!isOpen || !workspaceId || !session) return;

    let ignore = false;

    Promise.resolve()
      .then(() => {
        if (ignore) return null;
        setIsLoading(true);
        return fetch(`${API_URL}/api/chat/${workspaceId}`, {
          credentials: "include"
        });
      })
      .then((res) => res?.json())
      .then(data => {
        if (ignore) return;
        if (Array.isArray(data)) {
          setMessages(data);
        }
        setIsLoading(false);
        scrollToBottom();
      })
      .catch(err => {
        console.error("Failed to fetch chat history", err);
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, workspaceId, session, scrollToBottom]);

  // Socket connection
  useEffect(() => {
    if (isOpen && workspaceId && session && socket) {
      socket.emit("join_workspace_chat", workspaceId);

      const handleNewMessage = (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
      };

      socket.on("chat:new_message", handleNewMessage);

      return () => {
        socket.off("chat:new_message", handleNewMessage);
      };
    }
  }, [isOpen, workspaceId, session, socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !socket || !session) return;

    // Send via socket
    socket.emit("chat:send_message", {
      workspaceId,
      content: inputValue,
    });

    setInputValue("");
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="modal-backdrop fixed inset-0 bg-bg-secondary   z-90 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`drawer-panel fixed top-0 right-0 h-full w-full max-w-sm bg-bg-surface border-l border-border-subtle z-100 transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-primary">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-bg-active rounded-lg text-accent">
              <MessageCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary leading-tight">Team Chat</h2>
              <p className="text-xs text-text-tertiary flex items-center gap-1">
                <span className="live-dot w-2 h-2 rounded-full bg-accent"></span>
                Real-time
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="icon-action p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-bg-secondary ">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-accent" size={32} />
            </div>
          ) : !workspaceId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageCircle size={48} className="text-text-tertiary mb-4 opacity-50" />
              <p className="text-text-primary font-semibold mb-1">No Workspace Selected</p>
              <p className="text-text-secondary text-sm">Open a workspace to chat with your team!</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <MessageCircle size={48} className="text-text-tertiary mb-4 opacity-50" />
              <p className="text-text-primary font-semibold mb-1">No messages yet</p>
              <p className="text-text-secondary text-sm">Say hello to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === session?.user?.id;
              const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
              
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`flex max-w-[85%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar for Others */}
                    {!isMe && (
                      <div className="w-8 shrink-0 flex items-end">
                        {showAvatar ? (
                          msg.sender.image ? (
                            <Image src={msg.sender.image} alt={msg.sender.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover shadow-sm" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-border-default flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {msg.sender.name.charAt(0).toUpperCase()}
                            </div>
                          )
                        ) : (
                          <div className="w-8" /> // Empty space if consecutive message
                        )}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      {showAvatar && !isMe && (
                        <span className="text-[10px] text-text-tertiary ml-1 mb-1 font-medium">{msg.sender.name}</span>
                      )}
                      <div 
                        className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                          isMe 
                            ? "bg-accent text-accent-foreground rounded-br-none" 
                            : "bg-bg-surface border border-border-subtle text-text-primary rounded-bl-none"
                        }`}
                        style={{ wordBreak: 'break-word' }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border-subtle bg-bg-primary">
          <form 
            onSubmit={handleSend}
            className="flex items-center gap-2 bg-bg-surface border border-border-default rounded-full p-1 pl-4 focus-within:border-accent transition-colors shadow-inner"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={!workspaceId ? "Select a workspace to chat..." : "Type a message..."}
              className="flex-1 bg-bg-surface text-text-primary text-sm focus:outline-none placeholder:text-text-tertiary"
              disabled={isLoading || !workspaceId}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || !workspaceId}
              className="primary-action p-2.5 bg-accent text-accent-foreground rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
