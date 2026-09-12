import {readFileSync,writeFileSync} from 'node:fs';
const pages=[['index.html','agent'],['desk.html','accounting'],['lab.html','contract'],['evidence.html','evidence'],['examples.html','evidence']];
const links=[['agent','/','Agent'],['accounting','/desk.html','Accounting'],['contract','/lab.html','Contract lab'],['evidence','/evidence.html','Evidence']];
for(const [file,active] of pages){
 let html=readFileSync(`public/${file}`,'utf8');
 const header=`<header class="site-header"><a class="site-brand" href="/" aria-label="Velum home"><span aria-hidden="true">v</span>velum</a><nav aria-label="Main navigation">${links.map(([id,href,label])=>`<a href="${href}"${active===id?' aria-current="page"':''}>${label}</a>`).join('')}</nav><span class="site-edition">ETHONLINE 2026</span></header>`;
 const footer='<footer class="site-footer"><a class="site-brand" href="/"><span aria-hidden="true">v</span>velum</a><p>Give agents a task. Keep the authority.</p><a href="https://github.com/Lawrence-eth/velum">Source code ↗</a></footer>';
 html=html.replace(/<header\b[\s\S]*?<\/header>/,header).replace(/<footer\b[\s\S]*?<\/footer>/,footer);
 if(!html.includes('href="/site.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/site.css"></head>');
 if(!html.includes('class="skip-link"'))html=html.replace(/(<body[^>]*>)/,'$1<a class="skip-link" href="#main-content">Skip to content</a>');
 html=html.replace(/<main(?: id="main-content")?>/,'<main id="main-content">');
 writeFileSync(`public/${file}`,html);
}
