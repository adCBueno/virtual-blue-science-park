import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/account-provider";
import { BlueMascot } from "@/components/blue-mascot";
import { assistant as assistantService } from "@/data/services";
import {
  greeting,
  suggestedQuestions,
  type AssistantAction,
  type AssistantReply,
  type ChatMessage,
} from "@/lib/assistant";
import type { Company } from "@/lib/ecosystem";

const GREETED_KEY = "blue-science-park-blue-greeted";

/** Floating companion that answers from the data the signed-in user is actually allowed to see. */
export function AiAssistant({
  company,
  onAction,
  shifted,
  open,
  setOpen,
}: {
  company: Company | null;
  onAction: (action: AssistantAction) => void;
  shifted: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const { account } = useAccount();
  const generation = useRef({ currentId: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bubble, setBubble] = useState(false);
  const [pinged, setPinged] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const chat = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 767px)").matches) return;
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const resize = () => {
      chat.current?.style.setProperty(
        "--chat-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      chat.current?.style.setProperty("--chat-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      document.body.style.overflow = previousOverflow;
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  /* Blue says hello once per visitor, and never while the chat is already open. */
  useEffect(() => {
    if (open) {
      setBubble(false);
      return;
    }
    try {
      setBubble(window.localStorage.getItem(GREETED_KEY) !== "1");
    } catch {
      setBubble(false);
    }
  }, [open]);

  const tuckAway = () => {
    setBubble(false);
    try {
      window.localStorage.setItem(GREETED_KEY, "1");
    } catch {
      /* no storage: the greeting just stays for this visit */
    }
  };

  const launch = () => {
    tuckAway();
    setPinged(true);
    window.setTimeout(() => setPinged(false), 660);
    setOpen(true);
  };

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    const requested = ++generation.current.currentId;
    const history = messages.slice(-12).map((m) => ({ role: m.role, text: m.text }));
    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const reply: AssistantReply = await assistantService.reply({
        question: text,
        companyId: company?.id ?? null,
        history,
      });
      if (requested !== generation.current.currentId) return;
      setMessages((current) => [
        ...current,
        { role: "assistant", text: reply.answer, sources: reply.sources, action: reply.action },
      ]);
      onAction(reply.action);
    } catch (err) {
      if (requested !== generation.current.currentId) return;
      setError(
        err instanceof Error ? err.message : "Blue is unavailable right now. Please try again.",
      );
    } finally {
      if (requested === generation.current.currentId) setBusy(false);
    }
  };

  useLayoutEffect(() => {
    const requestState = generation.current;
    requestState.currentId++;
    setBusy(false);
    return () => {
      requestState.currentId++;
    };
  }, [company?.id]);

  const reset = () => {
    generation.current.currentId++;
    setBusy(false);
    setMessages([]);
    setInput("");
    setError("");
    setOpen(false);
  };

  return (
    <>
      {!open && (
        <div
          className={`blue-dock ${bubble ? "has-bubble" : ""} ${shifted ? "chat-shifted" : ""} ${pinged ? "is-pinged" : ""}`}
        >
          {bubble && (
            <div className="blue-bubble" role="status">
              <p>Hey! Need a hand exploring?</p>
              <button
                type="button"
                className="blue-bubble-close"
                aria-label="Dismiss Blue's greeting"
                onClick={tuckAway}
              >
                <X size={12} />
              </button>
            </div>
          )}
          <button
            type="button"
            className="blue-launcher"
            aria-label="Ask Blue, the Blue Science Park AI assistant"
            onClick={launch}
          >
            <span className="blue-tooltip" aria-hidden="true">
              Ask Blue
            </span>
            <BlueMascot size={62} />
          </button>
        </div>
      )}
      {open && (
        <aside
          ref={chat}
          className={`ai-chat ${shifted ? "chat-shifted" : ""}`}
          aria-label="Blue, the Blue Science Park AI assistant"
        >
          <div className="chat-top">
            <span className="chat-id">
              <BlueMascot size={34} mood={busy ? "thinking" : "idle"} />
              <span>
                <strong>Blue</strong>
                <small>Innovation companion</small>
              </span>
            </span>
            <span className="chat-tools">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Minimise assistant"
                onClick={() => setOpen(false)}
              >
                <Minus />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Close assistant" onClick={reset}>
                <X />
              </Button>
            </span>
          </div>
          <span className="chat-context">
            Exploring: <strong>{company?.name ?? "the whole park"}</strong>
            <small>
              {account
                ? `${account.role === "staff" ? "Park staff" : account.role === "representative" ? "Company representative" : "Signed-in account"} · private drafts included where allowed`
                : "Public visitor · public information only"}
            </small>
          </span>
          <div className="chat-messages" ref={scroller}>
            {messages.length === 0 && (
              <>
                <div className="chat-message chat-assistant">
                  <p>{greeting(company?.name ?? null)}</p>
                </div>
                <span className="chat-suggestions">
                  {suggestedQuestions(
                    company
                      ? {
                          id: company.id,
                          name: company.name,
                          industry: company.industry,
                          description: company.description,
                          tags: company.tags,
                          interests: company.interests,
                        }
                      : null,
                  ).map((question) => (
                    <Button
                      variant="outline"
                      size="sm"
                      key={question}
                      onClick={() => void ask(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </span>
              </>
            )}
            {messages.map((message, index) => (
              <div className={`chat-message chat-${message.role}`} key={index}>
                <p>{message.text}</p>
                {message.sources && message.sources.length > 0 && (
                  <span className="chat-sources">
                    {message.sources.map((source) => (
                      <span key={source.label}>
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.label}
                            <ExternalLinkMark />
                          </a>
                        ) : (
                          source.label
                        )}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            ))}
            {busy && (
              <div className="chat-message chat-assistant">
                <p className="chat-thinking">
                  <span />
                  <span />
                  <span />
                </p>
              </div>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <input
              aria-label="Ask Blue"
              placeholder={company ? `Ask about ${company.name}…` : "Ask about the ecosystem…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send question"
              disabled={busy || !input.trim()}
            >
              <ArrowUp />
            </Button>
          </form>
          <span className="chat-demo">
            Demo assistant · answers use illustrative prototype data
          </span>
        </aside>
      )}
    </>
  );
}

function ExternalLinkMark() {
  return <span aria-hidden="true"> ↗</span>;
}
