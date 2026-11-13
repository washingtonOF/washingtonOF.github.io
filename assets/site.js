document.getElementById('year').textContent=new Date().getFullYear();const menu=document.querySelector('.mobile-menu'),nav=document.querySelector('.nav');menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu?.setAttribute('aria-expanded','false')}));if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el))}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
// Staggered motion with a visible hero entrance; scroll effects handled above.
document.querySelectorAll('.hero .reveal, .story-hero .reveal').forEach(el=>{el.classList.add('visible')});

// Visible section motion: persistent animations use CSS, observer only reveals content.
window.addEventListener('load',()=>document.body.classList.add('ready'));
