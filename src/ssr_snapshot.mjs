// 用 Vite SSR 把 App 渲染成 HTML 快照，验证 React 渲染无运行时错误。
// 运行: node src/ssr_snapshot.mjs
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { writeFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { default: App } = await server.ssrLoadModule('/src/App.jsx');
  const html = renderToString(React.createElement(App));
  writeFileSync('/tmp/snapshot.html', html);
  // 简单检查：是否包含蛇头 circle 与 path
  const hasPath = html.includes('<path');
  const hasHead = html.includes('fill="#4caf50"');
  const hasWall = html.includes('cell wall');
  const hasDoor = html.includes('cell door');
  console.log('snapshot length:', html.length);
  console.log('has <path>:', hasPath, '| has head circle:', hasHead, '| has wall tile:', hasWall, '| has door tile:', hasDoor);
  console.log('---- snippet ----');
  console.log(html.split('\n').slice(0, 8).join('\n'));
} finally {
  await server.close();
}
