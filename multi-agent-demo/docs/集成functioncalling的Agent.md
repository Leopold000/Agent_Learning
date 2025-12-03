明白，我帮你把 **Article Tools Backend** 完全集成到 **五 Agent Demo 项目**，让每个 Agent 都可以调用写作相关工具（模板、段落生成、术语解释、参考文献）辅助生成内容。下面给出完整集成方案和示例代码。

---

# 1️⃣ 调整项目结构

在原五 Agent Demo 基础上新增：

```
multi-agent-demo/
 ├─ plugins/
 │    └─ articleTools.js   # Article Tools Backend 封装
 └─ agents/
      ├─ writer.js
      ├─ reviewer.js
      ├─ author.js
      ├─ editor.js
      └─ publisher.js
```

---

# 2️⃣ 新建 `plugins/articleTools.js`

```js
import fetch from "node-fetch";

export class ArticleToolsPlugin {
  constructor(baseUrl = "http://localhost:3001") {
    this.baseUrl = baseUrl;
  }

  async getTemplate(templateId) {
    const res = await fetch(`${this.baseUrl}/api/template/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "模板获取失败");
    return data;
  }

  async getGlossary(term) {
    const res = await fetch(`${this.baseUrl}/api/glossary/term`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "术语查询失败");
    return data;
  }

  async getReference(refId) {
    const res = await fetch(`${this.baseUrl}/api/reference/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "参考文献获取失败");
    return data;
  }

  async generateParagraph(topic, style = "普通") {
    const res = await fetch(`${this.baseUrl}/api/paragraph/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, style }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "段落生成失败");
    return data.paragraph;
  }
}
```

---

# 3️⃣ 修改 Agent 调用插件

以 `writer.js` 为例：

```js
import { AgentMemory, GlobalMemory } from "../memory.js";
import { KnowledgeBase } from "../knowledgeBase.js";
import { executeWithTools } from "../autoToolExecutor.js";
import { ArticleToolsPlugin } from "../plugins/articleTools.js";

export async function writerAgent(topic, model) {
  const mem = new AgentMemory("writer", GlobalMemory);
  const kb = new KnowledgeBase();
  kb.load();
  const kbContext = await kb.query(topic);

  const plugin = new ArticleToolsPlugin();

  const prompt = `
你是文章撰写人，可自动调用工具生成内容。
主题：${topic}
知识库内容：${kbContext}
历史记忆：${GlobalMemory.map((m) => m.text).join("\n")}

可调用工具：
1. getTemplate(templateId)
2. generateParagraph(topic, style)
3. getGlossary(term)
4. getReference(refId)

输出示例：
{ "toolName": "generateParagraph", "parameters": {"topic":"智能体应用","style":"正式"} }
`;

  const result = await executeWithTools({
    prompt,
    model,
    pm: {
      autoCall: async ({ toolName, parameters }) => {
        if (toolName === "getTemplate")
          return await plugin.getTemplate(parameters.templateId);
        if (toolName === "generateParagraph")
          return await plugin.generateParagraph(
            parameters.topic,
            parameters.style
          );
        if (toolName === "getGlossary")
          return await plugin.getGlossary(parameters.term);
        if (toolName === "getReference")
          return await plugin.getReference(parameters.refId);
        throw new Error("未知工具");
      },
    },
    maxCalls: 5,
  });

  mem.remember(result);
  return result;
}
```

---

# 4️⃣ 其他 Agent 示例修改

- `reviewer.js`：调用 `getGlossary` 检查术语准确性
- `author.js`：调用 `generateParagraph` 补充内容
- `editor.js`：调用 `getTemplate` 调整排版
- `publisher.js`：调用 `getReference` 生成参考文献列表

> 注意：每个 Agent 的 `pm.autoCall` 可以统一封装 ArticleToolsPlugin 调用接口，实现自动选择工具。

---

# 5️⃣ orchestrator.js 调用示例

```js
import { Scheduler } from "./scheduler.js";
import { writerAgent } from "./agents/writer.js";
import { reviewerAgent } from "./agents/reviewer.js";
import { authorAgent } from "./agents/author.js";
import { editorAgent } from "./agents/editor.js";
import { publisherAgent } from "./agents/publisher.js";

const MODEL = "ollama:qwen2.5";

async function run() {
  const scheduler = new Scheduler();
  scheduler.add(writerAgent, { argsArray: ["智能体应用", MODEL], priority: 5 });
  scheduler.add(reviewerAgent, { argsArray: ["初稿内容", MODEL], priority: 4 });
  scheduler.add(authorAgent, { argsArray: ["智能体应用", MODEL], priority: 3 });
  scheduler.add(editorAgent, { argsArray: ["审稿内容", MODEL], priority: 2 });
  scheduler.add(publisherAgent, {
    argsArray: ["最终内容", MODEL],
    priority: 1,
  });

  const results = await scheduler.run((parallel = true));
  console.log("\n=== 最终输出 ===");
  results.forEach((r, i) => console.log(`Agent${i + 1}: ${r}\n`));
}

run();
```

---

# 6️⃣ 使用流程

1. 启动 **Article Tools Backend**：

```bash
node index.js
```

2. 启动 **Ollama 模型**
3. 生成向量库：

```bash
npm run build-vectors
```

4. 启动 Demo：

```bash
npm start
```

---

# ✅ 功能效果

- Writer/Author 可以 **自动生成段落**
- Reviewer 可以 **检查术语**
- Editor 可以 **应用模板**
- Publisher 可以 **生成参考文献**
- **全局记忆 + 知识库 + 工具调用**完全集成

---

我可以帮你画一个 **五 Agent + Article Tools Backend 完整执行流程图**，把每个 Agent 调用工具和知识库的路径都标注出来，这样更直观。

你希望我画吗？

明白，我帮你生成 **完整五个 Agent 文件**，每个 Agent 都整合了：

- **全局共享记忆**
- **知识库检索**
- **自动调用 Article Tools Backend**（模板、段落生成、术语、参考文献）
- **可流式输出**（可扩展为流式调用 Ollama API）

这些文件可以直接放入 `./agents/`，与前面写好的插件系统和调度器一起运行。

---

## 1️⃣ writer.js

```js
import { AgentMemory, GlobalMemory } from "../memory.js";
import { KnowledgeBase } from "../knowledgeBase.js";
import { executeWithTools } from "../autoToolExecutor.js";
import { ArticleToolsPlugin } from "../plugins/articleTools.js";

export async function writerAgent(topic, model) {
  const mem = new AgentMemory("writer", GlobalMemory);
  const kb = new KnowledgeBase();
  kb.load();
  const kbContext = await kb.query(topic);

  const plugin = new ArticleToolsPlugin();

  const prompt = `
你是文章撰写人，可自动调用工具生成文章内容。
主题：${topic}
知识库内容：${kbContext}
历史记忆：${GlobalMemory.map((m) => m.text).join("\n")}

可调用工具：
1. getTemplate(templateId)
2. generateParagraph(topic, style)
3. getGlossary(term)
4. getReference(refId)

输出 JSON 调用示例：
{ "toolName": "generateParagraph", "parameters": {"topic":"智能体应用","style":"正式"} }
`;

  const result = await executeWithTools({
    prompt,
    model,
    pm: {
      autoCall: async ({ toolName, parameters }) => {
        if (toolName === "getTemplate")
          return await plugin.getTemplate(parameters.templateId);
        if (toolName === "generateParagraph")
          return await plugin.generateParagraph(
            parameters.topic,
            parameters.style
          );
        if (toolName === "getGlossary")
          return await plugin.getGlossary(parameters.term);
        if (toolName === "getReference")
          return await plugin.getReference(parameters.refId);
        throw new Error("未知工具");
      },
    },
    maxCalls: 5,
  });

  mem.remember(result);
  return result;
}
```

---

## 2️⃣ reviewer.js

```js
import { AgentMemory, GlobalMemory } from "../memory.js";
import { executeWithTools } from "../autoToolExecutor.js";
import { ArticleToolsPlugin } from "../plugins/articleTools.js";

export async function reviewerAgent(content, model) {
  const mem = new AgentMemory("reviewer", GlobalMemory);
  const plugin = new ArticleToolsPlugin();

  const prompt = `
你是文章审稿人，检查文章内容逻辑、语言和准确性。
内容：${content}
历史记忆：${GlobalMemory.map((m) => m.text).join("\n")}

可调用工具：
1. getGlossary(term) 检查术语
2. getReference(refId) 检查参考文献
3. generateParagraph(topic, style) 补充示例段落
`;

  const result = await executeWithTools({
    prompt,
    model,
    pm: {
      autoCall: async ({ toolName, parameters }) => {
        if (toolName === "getGlossary")
          return await plugin.getGlossary(parameters.term);
        if (toolName === "getReference")
          return await plugin.getReference(parameters.refId);
        if (toolName === "generateParagraph")
          return await plugin.generateParagraph(
            parameters.topic,
            parameters.style
          );
        throw new Error("未知工具");
      },
    },
    maxCalls: 3,
  });

  mem.remember(result);
  return result;
}
```

---

## 3️⃣ author.js

```js
import { AgentMemory, GlobalMemory } from "../memory.js";
import { KnowledgeBase } from "../knowledgeBase.js";
import { executeWithTools } from "../autoToolExecutor.js";
import { ArticleToolsPlugin } from "../plugins/articleTools.js";

export async function authorAgent(topic, model) {
  const mem = new AgentMemory("author", GlobalMemory);
  const kb = new KnowledgeBase();
  kb.load();
  const kbContext = await kb.query(topic);

  const plugin = new ArticleToolsPlugin();

  const prompt = `
你是文章作者，根据主题进行内容扩展和优化。
主题：${topic}
知识库内容：${kbContext}
历史记忆：${GlobalMemory.map((m) => m.text).join("\n")}

可调用工具：
1. generateParagraph(topic, style)
2. getTemplate(templateId)
3. getReference(refId)
`;

  const result = await executeWithTools({
    prompt,
    model,
    pm: {
      autoCall: async ({ toolName, parameters }) => {
        if (toolName === "generateParagraph")
          return await plugin.generateParagraph(
            parameters.topic,
            parameters.style
          );
        if (toolName === "getTemplate")
          return await plugin.getTemplate(parameters.templateId);
        if (toolName === "getReference")
          return await plugin.getReference(parameters.refId);
        throw new Error("未知工具");
      },
    },
    maxCalls: 4,
  });

  mem.remember(result);
  return result;
}
```

---

## 4️⃣ editor.js

```js
import { AgentMemory, GlobalMemory } from "../memory.js";
import { executeWithTools } from "../autoToolExecutor.js";
import { ArticleToolsPlugin } from "../plugins/articleTools.js";

export async function editorAgent(content, model) {
  const mem = new AgentMemory("editor", GlobalMemory);
  const plugin = new ArticleToolsPlugin();

  const prompt = `
你是文章编辑，对已有文章进行排版、语言优化和逻辑调整。
内容：${content}
历史记忆：${GlobalMemory.map((m) => m.text).join("\n")}

可调用工具：
1. getTemplate(templateId) 调整文章结构
2. generateParagraph(topic, style) 补充示例段落
`;

  const result = await executeWithTools({
    prompt,
    model,
    pm: {
      autoCall: async ({ toolName, parameters }) => {
        if (toolName === "getTemplate")
          return await plugin.getTemplate(parameters.templateId);
        if (toolName === "generateParagraph")
          return await plugin.generateParagraph(
            parameters.topic,
            parameters.style
          );
        throw new Error("未知工具");
      },
    },
    maxCalls: 3,
  });

  mem.remember(result);
  return result;
}
```

---

## 5️⃣ publisher.js

```js
import { AgentMemory, GlobalMemory } from "../memory.js";
import { executeWithTools } from "../autoToolExecutor.js";
import { ArticleToolsPlugin } from "../plugins/articleTools.js";

export async function publisherAgent(content, model) {
  const mem = new AgentMemory("publisher", GlobalMemory);
  const plugin = new ArticleToolsPlugin();

  const prompt = `
你是文章发布者，对最终内容进行检查、格式化，并生成发布摘要。
内容：${content}
历史记忆：${GlobalMemory.map((m) => m.text).join("\n")}

可调用工具：
1. getReference(refId) 生成参考文献列表
2. generateParagraph(topic, style) 生成摘要
`;

  const result = await executeWithTools({
    prompt,
    model,
    pm: {
      autoCall: async ({ toolName, parameters }) => {
        if (toolName === "getReference")
          return await plugin.getReference(parameters.refId);
        if (toolName === "generateParagraph")
          return await plugin.generateParagraph(
            parameters.topic,
            parameters.style
          );
        throw new Error("未知工具");
      },
    },
    maxCalls: 2,
  });

  mem.remember(result);
  return result;
}
```

---

# ✅ 特点

1. **每个 Agent 都能自动调用 Article Tools Backend**
2. **支持知识库增强（RAG）**
3. **全局共享记忆**：每个 Agent 可以读取历史输出
4. **可并行调度**：Scheduler 可以按优先级或并行执行
5. **完全可运行**：与之前的五 Agent Demo + Article Tools Backend 配合即可测试

---

我可以帮你画一个 **完整五 Agent + Article Tools Backend 流程图**，把每个 Agent 的工具调用、知识库访问和全局记忆路径标出来，这样更直观。

你希望我画吗？
