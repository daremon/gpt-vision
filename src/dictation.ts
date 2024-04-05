import { showListening, showNotListening } from "./main";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

let recognition = null;
let shouldRestart: Boolean = true;

export function startDictation(
  language: string,
  receivedEventsCallback: (message: string) => void
) {
  console.log("Recognition start");
  recognition = new window.webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = language;

  shouldRestart = true;

  recognition.onstart = () => {
    console.log("Recognition start event");
    showListening();
  };

  recognition.onend = () => {
    console.log("Recognition stop event with shouldRestart:", shouldRestart);
    showNotListening();
    if (shouldRestart) {
      recognition.start();
    }
  };

  recognition.onerror = (error: any) => {
    console.log("Recognition error event: ", error);
    if (error.error === "no-speech") {
      console.log("No speech detected");
    }
  };

  recognition.onresult = (event: any) => {
    console.log('Recognition result event');
    console.log(event.results);
    const newMessages: string[] = [];
    Array.from(event.results).forEach((result) => {
      newMessages.push(result[0].transcript);
    });

    if (newMessages.length > 0) {
      const transcription = newMessages.join(" ").trim();
      receivedEventsCallback(transcription);
    }
  };

  recognition.start();
}

export function stopDictation() {
  console.log('Dictation stop');
  shouldRestart = false;
  if (recognition) {
    recognition.stop();
  }
  recognition = null;
}
