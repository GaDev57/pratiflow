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
  patientName: string;
}

export function MessagingSection({
  currentUserId,
  patientId,
  patientName,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages and subscribe to realtime
  useEffect(() => {
    if (!expanded) return;

    const supabase = createClient();

    async function fetchMessages() {
      const { data } = await supabase
        .from("messages")
        .select("id, sender_id, content, read_at, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) ?? []);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("patient_id", patientId)
        .eq("recipient_id", currentUserId)
        .is("read_at", null);
    }

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          // Auto-mark as read if we're the recipient
          if (newMsg.sender_id !== currentUserId) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expanded, patientId, currentUserId]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);

    const supabase = createClient();

    // Get patient's profile_id for recipient
    const { data: patient } = await supabase
      .from("patients")
      .select("profile_id")
      .eq("id", patientId)
      .single();

    if (!patient) {
      setSending(false);
      return;
    }

    await supabase.from("messages").insert({
      sender_id: currentUserId,
      recipient_id: patient.profile_id as string,
      patient_id: patientId,
      content: newMessage.trim(),
    });

    setNewMessage("");
    setSending(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Messagerie</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Réduire" : `Ouvrir la conversation avec ${patientName}`}
        </Button>
      </div>

      {expanded && (
        <div className="rounded-lg border">
          {/* Messages list */}
          <div className="h-80 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun message. Envoyez le premier !
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
                          {new Date(msg.created_at).toLocaleTimeString(
                            "fr-FR",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
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

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="flex gap-2 border-t p-3"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Votre message..."
              className="flex-1"
              disabled={sending}
            />
            <Button type="submit" size="sm" disabled={sending || !newMessage.trim()}>
              Envoyer
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
