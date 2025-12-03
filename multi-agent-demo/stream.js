export async function printStream(stream) {
  let fullText = "";

  for await (const chunk of stream) {
    const text =
      chunk.message?.content || chunk.choices?.[0]?.delta?.content || "";
    process.stdout.write(text);
    fullText += text;
  }

  console.log("\n\n--- END ---\n");

  return fullText; // 返回给下一位智能体
}
