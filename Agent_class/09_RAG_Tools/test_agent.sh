#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 启动完整的智能RAG Agent测试${NC}"
echo -e "${CYAN}===============================${NC}"

# 1. 启动API服务器
echo -e "\n${YELLOW}1. 启动API服务器...${NC}"
node api_server.js &
API_PID=$!
echo -e "${GREEN}✅ API服务器启动成功 (PID: $API_PID)${NC}"
sleep 2 # 等待服务器启动

# 2. 测试Agent
echo -e "\n${YELLOW}2. 测试智能RAG Agent...${NC}"
echo -e "${CYAN}注意：这是一个交互式测试，你需要手动输入命令${NC}"
echo -e "${CYAN}测试完成后，输入 'exit' 退出${NC}"
echo -e "\n${GREEN}准备启动Agent，请按Enter继续...${NC}"
read

# 启动Agent（使用timeout限制运行时间）
echo -e "\n${CYAN}启动Agent...${NC}"
echo -e "${YELLOW}测试命令示例：${NC}"
echo -e "  • 计算: '2+3等于多少'"
echo -e "  • 转换: '20摄氏度等于多少华氏度'"
echo -e "  • 查询: '有哪些用户'"
echo -e "  • 公司: '公司信息'"
echo -e "  • 系统: '系统状态'"
echo -e "  • 退出: 'exit'"
echo -e "\n${CYAN}开始测试:${NC}"

# 由于Agent是交互式的，我们无法完全自动化测试
# 这里只是启动它，用户需要手动交互
node chat_rag.js

# 3. 清理
echo -e "\n${YELLOW}3. 清理进程...${NC}"
kill $API_PID 2>/dev/null
echo -e "${GREEN}✅ 清理完成${NC}"

echo -e "\n${CYAN}🎉 测试完成！${NC}"