import { makeOpenAIRequest } from "./openai";
import { startDictation, stopDictation } from "./dictation";
import { startCamera, stopCamera } from "./camera";
import { Speech } from "./speech";
import { buildLanguageSelect } from "./dictationLanguages";

let isRunning = false;
let listeningInterval = null;
let openAiCallInTransit = false;
let speech: Speech = new Speech();

export function updatePromptOutput(msg: string) {
  const promptOutput = document.getElementById("promptOutput");
  promptOutput.innerHTML += msg + "<br>";
  promptOutput.scrollTop = promptOutput.scrollHeight; // scroll to bottom
}

export function showListening() {
  let toggle = false;
  clearInterval(listeningInterval);

  listeningInterval = setInterval(() => {
    document.querySelector("#micStatus").textContent = toggle ? "🔊 now recording" : "🔈 now recording";
    toggle = !toggle;
  }, 600);}

export function showNotListening() {
  clearInterval(listeningInterval);
  document.querySelector("#micStatus").textContent = "🔇 processing";
}

export function getChosenLanguage() {
  return (document.querySelector("#languageSelect")! as any).value;
}

function scaleImageAndGetBase64(image: CanvasImageSource) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 500;
  canvas.height = 375;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const base64 = canvas.toDataURL("image/jpeg");
  document.querySelector("#lastImage")!.innerHTML = `<img src="${base64}">`;
  return base64;
}

function dictationEventHandler(message?: string) {
  console.log('dictationEventHandler called');
  if (!openAiCallInTransit) {
    console.log('dictationEventHandler executing');
    openAiCallInTransit = true;
    updatePromptOutput(message);
    const canvas = document.querySelector("#canvas") as HTMLCanvasElement;
    const imgBase64 = scaleImageAndGetBase64(canvas);
    const apiKey = import.meta.env.VITE_OPENAI_KEY;
    stopDictation();
    updatePromptOutput("** Sending question to OpenAI");
    makeOpenAIRequest(message, imgBase64, apiKey, speech).then(() => {
      startDictation(getChosenLanguage(), dictationEventHandler);
      openAiCallInTransit = false;
    });
  }
}

function isDesktopChrome() {
  const userAgent = navigator.userAgent;
  const isChrome = userAgent.includes('Chrome') || userAgent.includes('Chromium');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  return isChrome && !isMobile;
}

document.addEventListener("DOMContentLoaded", async function () {
  buildLanguageSelect();
  if (!isDesktopChrome()) {
    (document.querySelector("#startButton") as any).disabled = true;
    document.querySelector("#micStatus").innerHTML = '<span class="error"><br>Only works in desktop Chrome browsers for now</span>';
  }

  document
    .querySelector("#startButton")!
    .addEventListener("click", function () {
      isRunning = !isRunning;

      if (isRunning) {
        startCamera();
        startDictation(getChosenLanguage(), dictationEventHandler);
        document.querySelector("#startButton")!.textContent = "Stop";
      } else {
        stopCamera();
        stopDictation();
        document.querySelector("#startButton")!.textContent = "Start";
      }
    });
});
