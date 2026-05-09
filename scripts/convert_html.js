const fs = require('fs');

const html = fs.readFileSync('downloaded_stitch_screen.html', 'utf8');

// 1. Extract theme
const match = html.match(/tailwind\.config = (\{[\s\S]*?\})\s*<\/script>/);
if (match) {
  // Simple evaluation since it's just an object
  const config = new Function('return ' + match[1])();
  const theme = config.theme.extend;
  let css = '\n@theme {\n';
  
  if (theme.colors) {
    for (const [k, v] of Object.entries(theme.colors)) {
      css += `  --color-${k}: ${v};\n`;
    }
  }
  
  if (theme.spacing) {
    for (const [k, v] of Object.entries(theme.spacing)) {
      css += `  --spacing-${k}: ${v};\n`;
    }
  }
  
  if (theme.fontFamily) {
    for (const [k, v] of Object.entries(theme.fontFamily)) {
      css += `  --font-${k}: ${v.map(f => `'${f}'`).join(', ')};\n`;
    }
  }
  
  if (theme.fontSize) {
    for (const [k, v] of Object.entries(theme.fontSize)) {
      css += `  --text-${k}: ${v[0]};\n`;
      // We can map line heights and weights manually in CSS if needed, but Tailwind 4 text-[] handles it mostly.
      // We'll let text-sizes map basically
      if (v[1] && v[1].lineHeight) {
        css += `  --text-${k}--line-height: ${v[1].lineHeight};\n`;
      }
      if (v[1] && v[1].fontWeight) {
        css += `  --text-${k}--font-weight: ${v[1].fontWeight};\n`;
      }
    }
  }
  
  css += '}\n\n';
  
  // Extract custom styles
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    css += styleMatch[1] + '\n';
  }
  
  let globals = fs.readFileSync('src/app/globals.css', 'utf8');
  if (!globals.includes('--color-surface-variant')) {
    globals += css;
    fs.writeFileSync('src/app/globals.css', globals);
    console.log('Appended theme and styles to globals.css');
  }
}

// 2. Convert to JSX
let bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (bodyMatch) {
  let jsxContent = bodyMatch[1];
  
  // Replace class= with className=
  jsxContent = jsxContent.replace(/class=/g, 'className=');
  
  // Fix unclosed img tags
  jsxContent = jsxContent.replace(/<img([^>]+[^\/])>/g, '<img$1 />');
  
  // Fix unclosed input/br/hr tags if any
  jsxContent = jsxContent.replace(/<br>/g, '<br />');
  
  // Fix inline styles from style="prop: value;" to style={{ prop: 'value' }}
  jsxContent = jsxContent.replace(/style="([^"]+)"/g, (match, p1) => {
    const parts = p1.split(';').filter(Boolean);
    const obj = parts.map(p => {
      const [k, v] = p.split(':');
      if (!k || !v) return '';
      const camelK = k.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      return `${camelK}: '${v.trim().replace(/'/g, "\\'")}'`;
    }).filter(Boolean).join(', ');
    return `style={{ ${obj} }}`;
  });
  
  // Replace '<!--' and '-->' with '{/* ... */}'
  jsxContent = jsxContent.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  
  const componentTemplate = `
import React from 'react';

export default function IPLMindHome({ onStartGame }) {
  return (
    <div className="stadium-gradient min-h-screen text-on-surface selection:bg-secondary-container selection:text-on-secondary-container overflow-x-hidden">
      ${jsxContent.replace(/href="#"/g, 'href="#" onClick={(e) => e.preventDefault()}').replace('<button className="group relative inline-flex', '<button onClick={onStartGame} className="group relative inline-flex')}
    </div>
  );
}
`;

  fs.writeFileSync('src/components/IPLMindHome.js', componentTemplate);
  console.log('Created src/components/IPLMindHome.js');
}
