declare module "elevenlabs-js" {
  export function setApiKey(key: string): void;
  export function textToSpeech(
    voiceId: string,
    text: string,
    modelId?: string,
    voiceSettings?: Record<string, unknown>
  ): Promise<{
    saveFile: (fileName?: string) => Promise<void>;
    pipe: AsyncIterable<Buffer>;
  }>;
}
