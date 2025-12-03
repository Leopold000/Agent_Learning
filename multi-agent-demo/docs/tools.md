明白了，你的目标是把 **这些工具 API（客户信息、订单状态、商品搜索）** 集成到多智能体项目中，让每个 Agent 可以通过 **插件系统（PluginManager）** 调用这些服务，并且在生成内容时自动使用。下面我给你一个 **完整可运行的实现方案**，适用于你的当前项目架构（Scheduler + Agent + Memory + Plugin + RAG）。

---

# 1️⃣ 改造 PluginManager 支持 HTTP API 工具

`/plugins.js` 改造如下：

```js
import fetch from "node-fetch";

/**
 * PluginManager：支持注册工具 API
 */
export class PluginManager {
  constructor() {
    this.plugins = {};
  }

  /**
   * 注册插件
   * @param {string} name 插件名称
   * @param {function} func 插件函数，支持 async
   */
  register(name, func) {
    this.plugins[name] = func;
  }

  /**
   * 调用插件
   * @param {string} name
   * @param  {...any} args
   * @returns {Promise<any>}
   */
  async run(name, ...args) {
    if (!this.plugins[name]) throw new Error(`Plugin not found: ${name}`);
    return await this.plugins[name](...args);
  }
}

/**
 * 内置工具注册示例：my-langchain-backend
 */
export function registerMyLangchainBackend(pm) {
  const BASE_URL = "http://localhost:3000";

  // 客户信息查询
  pm.register("getCustomerInfo", async (customerId) => {
    const res = await fetch(`${BASE_URL}/api/customer/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "未知错误");
    return data;
  });

  // 订单状态查询
  pm.register("getOrderStatus", async (orderId) => {
    const res = await fetch(`${BASE_URL}/api/order/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "未知错误");
    return data;
  });

  // 商品搜索
  pm.register("searchProduct", async (keyword) => {
    const res = await fetch(`${BASE_URL}/api/product/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "未知错误");
    return data.products || [];
  });
}
```

---

# 2️⃣ Agent 内调用插件示例

例如 **writerAgent** 想要结合知识库 + 客户信息 + 商品搜索生成内容：

```js
import { AgentMemory } from "../memory.js";
import { PluginManager, registerMyLangchainBackend } from "../plugins.js";
import { KnowledgeBase } from "../knowledgeBase.js";
import { runModel } from "../llm.js";
import { printStream } from "../stream.js";

export async function writerAgent(topic, model) {
  const mem = new AgentMemory("writer");
  const pm = new PluginManager();
  registerMyLangchainBackend(pm); // 注册所有工具

  const kb = new KnowledgeBase();
  await kb.init();

  // 从知识库获取背景信息
  const context = await kb.query(topic);

  // 调用工具：搜索商品示例
  const products = await pm.run("searchProduct", "耳机");

  const productInfo = products
    .map((p) => `${p.name} (${p.price}元, 库存:${p.stock})`)
    .join("\n");

  const prompt = `
你是文章撰写人，请生成关于 "${topic}" 的文章：
知识库信息：${context}
可参考商品信息：${productInfo}
`;

  const stream = await runModel({ model, prompt, streaming: true });
  const result = await printStream(stream);

  mem.remember(result); // 保存记忆

  return result;
}
```

---

# 3️⃣ 调用客户信息 / 订单状态示例

在 **reviewerAgent** 或 **authorAgent** 中使用：

```js
const customer = await pm.run("getCustomerInfo", "CUST-001");
const order = await pm.run("getOrderStatus", "ORD-1001");

const prompt = `
请根据客户信息和订单信息生成报告：
客户：${customer.name}, ${customer.level}, ${customer.email}
订单：${order.status}, 金额 ${order.amount} 元
`;
```

---

# 4️⃣ 将插件系统与调度器结合

你原来的 `Scheduler` 可以保持不变，每个 Agent 内部创建 `PluginManager` 并注册工具即可：

```js
import { Scheduler } from "./scheduler.js";
import { writerAgent } from "./agents/writer.js";
import { reviewerAgent } from "./agents/reviewer.js";

const scheduler = new Scheduler();
scheduler.add(writerAgent, { argsArray: ["智能体应用", "ollama:qwen2.5"] });
scheduler.add(reviewerAgent, { argsArray: ["初稿内容", "ollama:qwen2.5"] });

const results = await scheduler.run();
```

每个 Agent 内部都可以通过 `pm.run("工具名", 参数)` 调用你注册的 API。

---

# 5️⃣ 优点

1. **统一插件接口**：Agent 无需关心具体 HTTP 请求细节
2. **可扩展**：未来新增工具只需在 `registerMyLangchainBackend(pm)` 内注册
3. **兼容多 Agent + Memory + RAG**
4. **可与本地 Ollama 或云端模型结合**
5. **可实现 Function Calling**，LangChain.js 也支持 `LLMChain` + `Tools`

---

我可以帮你 **把整个 multi-agent-demo 项目整合成：**

- Scheduler
- Agent 内部记忆
- RAG 知识库
- 插件系统（注册 my-langchain-backend 所有工具）
- 流式输出
- 支持本地 Ollama + 云端模型

并生成 **完整 orchestrator.js 流程示例**，可以直接运行调用工具 API。

你希望我帮你生成这个完整整合版吗？

明白了，你想要实现 **真正的“自动工具调用（Function Calling / Tool Calling）”**，也就是说智能体根据输入内容 **动态决定调用哪个工具，并传入参数**，而不是我们手动在 Agent 内写死调用逻辑。

下面我给你一个 **完整可运行方案**，基于你现有项目（Node.js + LangChain.js + Ollama / 云端模型），集成：

- **自动工具调用（Auto Tool Calling）**
- **插件系统（ToolManager）**
- **流式输出 + 内部记忆 + RAG**

---

# 1️⃣ 核心思路

1. 每个 Agent 拥有 **一组工具/插件（PluginManager）**。
2. LLM 模型生成文本时，可以使用 **约定格式**（JSON 或 Function Call 规范）告诉系统要调用哪个工具，以及传入参数。
3. 系统解析 LLM 输出 → 调用相应工具 → 将返回结果注入到下一轮 LLM prompt。
4. 支持循环调用或多次工具调用（可限制次数避免死循环）。

---

# 2️⃣ 改造 PluginManager 支持自动调用

`plugins.js`：

```js
import fetch from "node-fetch";

export class PluginManager {
  constructor() {
    this.plugins = {};
  }

  register(name, func) {
    this.plugins[name] = func;
  }

  async run(name, args = {}) {
    if (!this.plugins[name]) throw new Error(`Plugin not found: ${name}`);
    return await this.plugins[name](args);
  }

  /**
   * 自动调用工具
   * @param {Object} toolCall {toolName, parameters}
   */
  async autoCall(toolCall) {
    const { toolName, parameters } = toolCall;
    return await this.run(toolName, parameters);
  }
}

/**
 * 注册 my-langchain-backend 工具
 */
export function registerMyLangchainBackend(pm) {
  const BASE_URL = "http://localhost:3000";

  pm.register("getCustomerInfo", async ({ customerId }) => {
    const res = await fetch(`${BASE_URL}/api/customer/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "未知错误");
    return data;
  });

  pm.register("getOrderStatus", async ({ orderId }) => {
    const res = await fetch(`${BASE_URL}/api/order/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "未知错误");
    return data;
  });

  pm.register("searchProduct", async ({ keyword }) => {
    const res = await fetch(`${BASE_URL}/api/product/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error || "未知错误");
    return data.products || [];
  });
}
```

---

# 3️⃣ LLM 输出约定

我们让 LLM 输出 **JSON 指令**，示例：

```json
{
  "toolName": "getCustomerInfo",
  "parameters": { "customerId": "CUST-001" }
}
```

- 解析 JSON → 调用对应工具 → 将结果注入下一轮 prompt
- 如果 LLM 输出普通文本，则直接返回

---

# 4️⃣ 自动工具调用执行器（AutoToolExecutor）

`autoToolExecutor.js`：

```js
import { runModel } from "./llm.js";
import { printStream } from "./stream.js";

export async function executeWithTools({ prompt, model, pm, maxCalls = 3 }) {
  let context = "";
  let remainingCalls = maxCalls;

  while (remainingCalls > 0) {
    // 1️⃣ 调用 LLM
    const stream = await runModel({
      model,
      prompt: prompt + "\n" + context,
      streaming: true,
    });
    const llmOutput = await printStream(stream);

    // 2️⃣ 尝试解析工具调用指令
    let toolCall = null;
    try {
      toolCall = JSON.parse(llmOutput.trim());
    } catch (err) {
      // 不是 JSON，则认为是最终文本
      return llmOutput;
    }

    if (toolCall?.toolName) {
      console.log(
        "==> LLM 要求调用工具:",
        toolCall.toolName,
        toolCall.parameters
      );
      const toolResult = await pm.autoCall(toolCall);
      console.log("==> 工具返回:", toolResult);

      // 将工具结果加入 context 供下一轮 LLM 使用
      context += `\n工具调用结果：${JSON.stringify(toolResult)}`;
      remainingCalls--;
    } else {
      return llmOutput;
    }
  }

  return context;
}
```

---

# 5️⃣ 在 Agent 中使用

例如 `writerAgent.js`：

```js
import { AgentMemory } from "../memory.js";
import { PluginManager, registerMyLangchainBackend } from "../plugins.js";
import { KnowledgeBase } from "../knowledgeBase.js";
import { executeWithTools } from "../autoToolExecutor.js";

export async function writerAgent(topic, model) {
  const mem = new AgentMemory("writer");
  const pm = new PluginManager();
  registerMyLangchainBackend(pm);

  const kb = new KnowledgeBase();
  await kb.init();
  const kbContext = await kb.query(topic);

  const prompt = `
你是文章撰写人，可以根据需要自动调用工具生成信息。
主题：${topic}
知识库信息：${kbContext}

如果需要调用工具，请使用 JSON 格式：
{
  "toolName": "工具名",
  "parameters": { "参数名": "参数值" }
}
`;

  const finalOutput = await executeWithTools({
    prompt,
    model,
    pm,
    maxCalls: 5,
  });

  mem.remember(finalOutput);
  return finalOutput;
}
```

---

# 6️⃣ 流程说明

1. **Agent 生成初稿** → LLM 输出 JSON 指令 → 调用工具 → 将结果加入上下文
2. **循环最多 maxCalls 次**
3. **输出最终文本**
4. **Scheduler / Memory / RAG** 可继续正常使用

---

# 7️⃣ 优势

- LLM 可 **自主决定调用哪些工具**
- 支持多轮工具调用（动态决策）
- 与现有多智能体架构兼容
- 可扩展插件，任何 HTTP API 都能注册
- 流式输出 + 内部记忆 + 知识库都可同时使用

---

我可以帮你生成 **完整 multi-agent-demo 示例工程**，在 **writer / reviewer / author / editor / publisher** 每个 Agent 都支持 **自动工具调用 + RAG + Memory + Scheduler**，直接运行就能演示：

- LLM 根据输入自动调用 my-langchain-backend 工具
- 每轮调用工具结果自动注入 LLM
- 可流式输出内容

---

你希望我帮你生成这个 **完整可运行工程** 吗？
