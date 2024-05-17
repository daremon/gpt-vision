import OpenAI from "openai";
import Completions from "openai";

import { updatePromptOutput } from "./main";
import { type Speech } from "./speech";

const DEFAULT_DEV_API_KEY = import.meta.env.VITE_OPENAI_KEY;
export const OPENAI_MODEL = "gpt-4o";
export const OPEN_AI_SYSTEM_PROMPT = `The user will take a photo of himself using his webcam.
They will show you things visually and ask you questions.
Be extremely brief and very concise, no more than 10 words.
Be extremely concise. this is very important for me.
Do not comment on what the person is wearing or where they are sitting or their background unless they ask.
Focus on the question they ask you.
`;

function formatErrorMessage(originalMessage: string): [string, number | null] {
  const regex = /429.*?Limit (\d+).*Used (\d+).*Requested (\d+).*in ([\d.]+s)/;

  const match = originalMessage.match(regex);
  if (match) {
    const [ , limit, used, requested, retryAfter] = match;
    const formattedMessage = `Error 429 Rate limit reached on tokens per min (TPM): Limit ${limit}, Used ${used}, Requested ${requested}. Try again in ${retryAfter}.`;
    const retryAfterSeconds = parseFloat(retryAfter);
    return [formattedMessage, retryAfterSeconds];
  }

  return [originalMessage, null];
}

export async function makeOpenAIRequest(
  text: string,
  imageUrl: string,
  apiKey = DEFAULT_DEV_API_KEY,
  speech: Speech
) {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const messages:Array<Completions.ChatCompletionMessageParam> = [
    {
      role: "system",
      content: OPEN_AI_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: text,
        },
        {
          type: "image_url",
          image_url: {
            url: imageUrl,
            detail: "high"
          }
        }
      ]
    }
  ];

  try {
    const stream = await openai.chat.completions.create({
      messages: messages,
      model: OPENAI_MODEL,
      max_tokens: 3500,
      temperature: 0,
      stream: true,
    });

    let answer = "";

    for await (const chunk of stream) {
      const message = chunk.choices[0]?.delta?.content;
      if (!message) {
        continue;
      }
      answer += message;
    }

    updatePromptOutput(answer);
    updatePromptOutput("----------");

    speech.startStream();
    speech.addToStream(answer);

  } catch (error) {
    const [formattedMessage, retryAfterSeconds] = formatErrorMessage(error.message);
    updatePromptOutput("##########");
    updatePromptOutput(formattedMessage);
    if (retryAfterSeconds !== null) {
      updatePromptOutput("Waiting...");
      setTimeout(() => {
        updatePromptOutput("Ready!");
        updatePromptOutput("----------");
      }, retryAfterSeconds * 1000);
    } else {
      updatePromptOutput("----------");
    }
  }

  // wait until the speech is done
  while (!speech.speakStreamIsDone()) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
