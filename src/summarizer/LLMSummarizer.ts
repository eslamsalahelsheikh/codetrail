import { Config } from '../utils/config';
import { log, logError } from '../utils/logger';

export class LLMSummarizer {
  async summarize(prompt: string): Promise<string | undefined> {
    if (Config.aiProvider === 'none') {
      return undefined;
    }

    try {
      return await this.callOllama(prompt);
    } catch (err) {
      logError('LLM summarization failed', err);
      return undefined;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (Config.aiProvider === 'none') {
      return false;
    }
    try {
      const response = await fetch(`${Config.ollamaEndpoint}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async callOllama(prompt: string): Promise<string> {
    const endpoint = `${Config.ollamaEndpoint}/api/generate`;

    log(`Calling Ollama (${Config.ollamaModel})...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Config.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 500,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { response: string };
    log('Ollama response received');
    return data.response.trim();
  }
}
