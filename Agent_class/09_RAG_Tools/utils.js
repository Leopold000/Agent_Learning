import readline from "node:readline";

// ================== 颜色常量 ==================

export const C = {
  dim: "\x1b[2m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// ================== 输出工具 ==================

export function line() {
  console.log(
    C.dim + "──────────────────────────────────────────────" + C.reset
  );
}

export function printSection(title) {
  console.log(C.cyan + `\n${title}` + C.reset);
  line();
}

export function printInfo(message) {
  console.log(C.blue + message + C.reset);
}

export function printSuccess(message) {
  console.log(C.green + message + C.reset);
}

export function printWarning(message) {
  console.log(C.yellow + message + C.reset);
}

export function printError(message) {
  console.log(C.magenta + message + C.reset);
}

export function printDebug(message) {
  console.log(C.dim + message + C.reset);
}

// ================== Readline工具 ==================

let rl = null;

export function createReadline() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

export function closeReadline() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

export async function askQuestion(question) {
  const rlInstance = createReadline();
  return new Promise((resolve) => {
    rlInstance.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// ================== 通用工具 ==================

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatList(items, bullet = "•") {
  return items.map(item => `  ${bullet} ${item}`).join("\n");
}

export function truncateText(text, maxLength = 150) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}