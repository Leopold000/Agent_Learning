- # LangChain.js 知识库构建笔记

  ## 1. 知识库特点
  - 支持多格式文件：PDF、DOCX、MD、JS 等  
  - 本地向量化：使用 Ollama 的 `nomic-embed-text` 模型  
  - 采用 JSON 存储向量，便于快速开发  

  ## 2. 架构流程
  ```mermaid
  flowchart TD
    A[原始文档] --> B[抽取文本]
    B --> C[生成向量]
    C --> D[向量库 JSON]
    D --> E[RAG 检索]