"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function DynamicFavicon() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // resolvedTheme is undefined during SSR and initial render
    if (!resolvedTheme) return;

    const favicon = resolvedTheme === "dark" ? "/favicon-dark.ico" : "/favicon-light.ico";
    
    // Update main favicon
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;

    // Update shortcut icon
    let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
    if (!shortcutLink) {
      shortcutLink = document.createElement("link");
      shortcutLink.rel = "shortcut icon";
      document.head.appendChild(shortcutLink);
    }
    shortcutLink.href = favicon;

    // Update apple-touch-icon
    const appleTouchIcon = resolvedTheme === "dark" 
      ? "/apple-touch-icon-dark.png" 
      : "/apple-touch-icon-light.png";
    
    let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    if (!appleLink) {
      appleLink = document.createElement("link");
      appleLink.rel = "apple-touch-icon";
      document.head.appendChild(appleLink);
    }
    appleLink.href = appleTouchIcon;

    // Update 16x16 favicon
    const favicon16 = resolvedTheme === "dark" 
      ? "/favicon-16x16-dark.png" 
      : "/favicon-16x16-light.png";
    
    let link16 = document.querySelector("link[rel='icon'][sizes='16x16']") as HTMLLinkElement;
    if (!link16) {
      link16 = document.createElement("link");
      link16.rel = "icon";
      link16.type = "image/png";
      link16.sizes = "16x16";
      document.head.appendChild(link16);
    }
    link16.href = favicon16;

    // Update 32x32 favicon
    const favicon32 = resolvedTheme === "dark" 
      ? "/favicon-32x32-dark.png" 
      : "/favicon-32x32-light.png";
    
    let link32 = document.querySelector("link[rel='icon'][sizes='32x32']") as HTMLLinkElement;
    if (!link32) {
      link32 = document.createElement("link");
      link32.rel = "icon";
      link32.type = "image/png";
      link32.sizes = "32x32";
      document.head.appendChild(link32);
    }
    link32.href = favicon32;

  }, [resolvedTheme]);

  return null;
}