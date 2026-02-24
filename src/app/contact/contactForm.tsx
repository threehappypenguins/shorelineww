"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_MOBILE_BREAKPOINT = 640;

function getTurnstileSize(): "compact" | "flexible" {
  if (typeof window === "undefined") return "flexible";
  return window.innerWidth < TURNSTILE_MOBILE_BREAKPOINT ? "compact" : "flexible";
}

const inputBase =
  "w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground";
const inputError = "border-red-500 focus:border-red-500 focus:ring-red-500";

export default function ContactForm() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [turnstileSize, setTurnstileSize] = useState<"compact" | "flexible">("flexible");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [captchaToken, setCaptchaToken] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    name: false,
    email: false,
    subject: false,
    message: false,
    captcha: false,
  });
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setTurnstileSize(getTurnstileSize());
    const onResize = () => setTurnstileSize(getTurnstileSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;
    if (!sitekey) {
      console.warn("NEXT_PUBLIC_TURNSTILE_SITEKEY is not set");
      return;
    }

    const renderWidget = () => {
      if (typeof window === "undefined" || !window.turnstile) return;
      const container = document.getElementById("turnstile-container");
      if (!container || widgetIdRef.current) return;

      const size = getTurnstileSize();
      const id = window.turnstile.render("#turnstile-container", {
        sitekey,
        theme: resolvedTheme === "dark" ? "dark" : "light",
        size,
        callback: (token: string) => {
          setCaptchaToken(token);
          setErrors((prev) => (prev.captcha ? { ...prev, captcha: false } : prev));
        },
        "error-callback": () => setCaptchaToken(""),
        "expired-callback": () => setCaptchaToken(""),
      });
      widgetIdRef.current = id;
    };

    if (typeof window !== "undefined" && window.turnstile) {
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT}"]`);
    if (existing) {
      renderWidget();
      return () => {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT;
    script.onload = renderWidget;
    document.body.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [mounted, resolvedTheme, turnstileSize]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleSubmit = async () => {
    const newErrors = {
      name: !formData.name.trim(),
      email: !formData.email.trim() || !formData.email.includes("@"),
      subject: !formData.subject.trim(),
      message: !formData.message.trim(),
      captcha: !captchaToken,
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(Boolean)) {
      const firstError = Object.keys(newErrors).find(
        (key) => newErrors[key as keyof typeof newErrors]
      );
      if (firstError) {
        document.getElementById(firstError)?.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: formData.subject,
          message: formData.message,
          "cf-turnstile-response": captchaToken,
        }),
      });

      let result: { success?: boolean; message?: string };
      try {
        result = await response.json();
      } catch {
        alert("Something went wrong. Please try again later.");
        return;
      }

      if (result.success) {
        setShowModal(true);
        setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
        setCaptchaToken("");
        setErrors({
          name: false,
          email: false,
          subject: false,
          message: false,
          captcha: false,
        });
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      } else {
        alert(result.message ?? "Failed to send message. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
        <h2 className="text-2xl font-bold mb-6">
          Send Us a Message
        </h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className={`${inputBase} ${errors.name ? inputError : ""}`}
                required
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">Name is required</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className={`${inputBase} ${errors.email ? inputError : ""}`}
                required
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  Valid email is required
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-2">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              className={inputBase}
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What's this about?"
              className={`${inputBase} ${errors.subject ? inputError : ""}`}
              required
            />
            {errors.subject && (
              <p className="text-red-500 text-sm mt-1">Subject is required</p>
            )}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us about your project..."
              rows={6}
              className={`${inputBase} resize-none ${errors.message ? inputError : ""}`}
              required
            />
            {errors.message && (
              <p className="text-red-500 text-sm mt-1">Message is required</p>
            )}
          </div>

          <div className="min-w-0 max-w-full overflow-hidden">
            {mounted && <div id="turnstile-container" />}
            {errors.captcha && (
              <p className="text-red-500 text-sm mt-2">
                Please complete the verification
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors duration-200 hover:bg-primary/90 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {isSubmitting ? "Sending…" : "Send Message"}
          </button>
        </div>
      </div>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-modal-title"
          aria-describedby="result-modal-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-lg shadow-xl p-6 border border-green-500/50 bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="result-modal-title"
              className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400"
            >
              Message sent
            </h3>
            <p id="result-modal-desc" className="text-muted-foreground mb-6">
              Your message was sent successfully. We&apos;ll get back to you soon.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
