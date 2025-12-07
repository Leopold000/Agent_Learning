# 快速开始指南

## 🎯 项目概述

这是一个从基础到进阶的Agent开发学习项目，最新版本是**09_RAG_Tools**，实现了智能工具调用RAG助手。

## 🚀 三步快速体验

### 第1步：准备环境
确保已安装：
- Node.js (v16+)
- Ollama (运行 `ollama pull llama3.1:8b`)

### 第2步：启动最新版本 (09_RAG_Tools)
```bash
# 1. 进入项目目录
cd Agent_Learning/Agent_class

# 2. 启动API服务器 (新终端)
cd 09_RAG_Tools
node api_server.js

# 3. 启动智能Agent (新终端)
cd 09_RAG_Tools
node chat_rag.js
```

### 第3步：开始交互
Agent启动后，尝试以下查询：

```
✨ 智能RAG助手启动！
──────────────────────────────────────────────
🧠 特性：智能检索决策 + 多轮对话 + 流式输出 + 工具调用
📊 模式：混合（规则 + LLM意图分析）
🛠️ 支持工具：计算器、单位转换、数据查询、系统状态等
──────────────────────────────────────────────

🧑 你：2+3等于多少
🧑 你：20摄氏度等于多少华氏度
🧑 你：有哪些用户
🧑 你：公司信息
🧑 你：系统状态
```

## 📚 学习路径建议

### 初学者路线
1. **00_basic.js**: 基础API调用
2. **01_chat.js**: 简单聊天
3. **04_terminal_chat.js**: 终端交互
4. **06_rag/**: 基础RAG
5. **09_RAG_Tools**: 最新完整版

### 开发者路线
1. **07_RAG_intellingent/**: 学习智能检索决策
2. **08_RAG_tools/**: 学习Function Calling
3. **09_RAG_Tools/**: 学习完整系统集成

## 🔧 核心文件说明

### 最新版本 (09_RAG_Tools)
- `chat_rag.js`: 主程序，智能RAG助手
- `tool_manager.js`: 工具管理核心模块
- `api_server.js`: Mock API服务器
- `test_tools.js`: 工具调用测试

### 历史版本
- `00-05/`: 基础学习文件
- `06_rag/`: 基础RAG实现
- `07_RAG_intellingent/`: 智能检索决策
- `08_RAG_tools/`: Function Calling实现

## 🛠️ 常用命令

### 测试命令
```bash
# 测试工具调用
cd 09_RAG_Tools
node test_tools.js

# 快速测试
node quick_test.js
```

### 开发命令
```bash
# 查看所有版本
ls -la

# 运行特定版本
node 04_terminal_chat.js
cd 06_rag && node chat_rag.js
cd 07_RAG_intellingent && node chat_rag.js
```

## 📖 详细文档

- [完整README](./README.md): 项目详细说明
- [09版本文档](./09_RAG_Tools/README.md): 最新版本详细说明
- [07版本文档](./07_RAG_intellingent/demo_intelligent_rag.md): 智能检索决策说明
- [08版本文档](./08_RAG_tools/README.md): Function Calling说明

## ❓ 常见问题

### Q1: 启动时提示"知识库加载失败"
A: 首次运行需要构建知识库，请先运行：
```bash
cd 06_rag
node embed.js  # 构建知识库向量
```

### Q2: API服务器启动失败
A: 检查端口3000是否被占用，或修改`api_server.js`中的`PORT`常量。

### Q3: Ollama连接失败
A: 确保Ollama服务正在运行：
```bash
ollama serve
```

### Q4: 工具调用返回400错误
A: 检查API服务器是否正常运行，或者参数提取可能有问题。

## 🔮 下一步

1. **体验完整功能**: 使用09版本尝试各种查询
2. **学习源码**: 阅读`tool_manager.js`理解工具调用原理
3. **扩展功能**: 参考扩展指南添加新工具
4. **构建知识库**: 在`data/`文件夹添加自己的文档

---

**开始你的Agent开发之旅吧！** 🚀