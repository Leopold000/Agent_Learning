import { AzureChatOpenAI } from "@langchain/openai";
import { API_KEYS, MODEL_NAME } from "../../config.js";

export function createAzureModel() {
  return new AzureChatOpenAI({
    apiKey: API_KEYS.azure,
    model: MODEL_NAME.azure,
    temperature: 0.3,
    azureDeployment: MODEL_NAME.azure,
    azureBasePath: process.env.AZURE_ENDPOINT
  });
}
