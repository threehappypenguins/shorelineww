'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [result, setResult] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult("Sending....");

    const form = event.currentTarget; // capture before any await
    const formData = new FormData(form);
    formData.append("access_key", "57bff914-630b-42cf-828f-c92885a958fd");
    
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult("Form Submitted Successfully");
        form.reset();
      } else {
        console.log("API Error:", data);
        setResult(data.message || "Error submitting form. Please try again.");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setResult("Network error. Please check your connection and try again.");
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
      <h2 className="text-2xl font-bold mb-6">
        Send Us a Message
      </h2>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="Your name"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="your.email@example.com"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={6}
            required
            placeholder="Tell us about your project..."
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground resize-none"
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors duration-200 hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Send Message
        </button>

        {result && (
          <p className={`text-center font-medium ${
            result.includes("Success") 
              ? "text-green-600" 
              : result.includes("Error") || result.includes("Network")
              ? "text-red-600" 
              : "text-muted-foreground"
          }`}>
            {result}
          </p>
        )}
      </form>
    </div>
  );
}