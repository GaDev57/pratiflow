"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface Props {
  currentUserId: string;
  patientId: string;
  recipientId: string;
  practitionerName: string;
  initialMessages: Message[];
}

export function PatientMessaging({
  currentUserId,
  patientId,
  recipientId,
  practitionerName,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark unread messages as read on mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("patient_id", patientId)
      .eq("recipient_id", currentUserId)
      .is("read_at", null)
      .then(() => {});
  }, [patientId, currentUserId]);

  // Subscribe to realtime
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`patient-messages:${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);

          // Auto-mark as read
          if (msg.sender_id !== currentUserId) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", msg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);

    const supabase = createClient();
    await supabase.from("messages").insert({
      sender_id: currentUserId,
      recipient_id: recipientId,
      patient_id: patientId,
      content: newMessage.trim(),
    });

    setNewMessage("");
    setSending(false);
  }

  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-2 text-sm font-medium">
        {practitionerName}
      </div>

      <div className="h-96 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun message. Écrivez à votre praticien !
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMe
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {isMe && msg.read_at && " ✓✓"}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t p-3">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Votre message..."
          className="flex-1"
          disabled={sending}
        />
        <Button
          type="submit"
          size="sm"
          disabled={sending || !newMessage.trim()}
        >
          Envoyer
        </Button>
      </form>
    </div>
  );
}
