/**
 * 一个示例：自定义加法函数
 * 用于测试代码类文件的向量化效果
 */

export function add_RAGTest(a, b) {
  return a + b;
}

/**
 * RAG 检索测试说明：
 *
 * 如果你问“加法函数在哪里定义？”
 * RAG 应该会检索到这个文件（code.js）
 */

console.log("Example add(2, 3) =", add(2, 3));
