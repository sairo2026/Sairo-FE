export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let pendingPrompt: InstallPromptEvent | null = null;

export function takeInstallPrompt() {
  const event = pendingPrompt;
  pendingPrompt = null;
  return event;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    pendingPrompt = event as InstallPromptEvent;
  });
  window.addEventListener("appinstalled", () => {
    pendingPrompt = null;
  });
}
