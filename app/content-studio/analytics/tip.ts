let atipEl: HTMLDivElement | null = null;

function tipEl() {
  if (!atipEl) {
    atipEl = document.createElement('div');
    atipEl.className = 'atip';
    document.body.append(atipEl);
  }
  return atipEl;
}

export function showTip(e: { clientX: number; clientY: number }, html: string) {
  const t = tipEl();
  t.innerHTML = html;
  t.style.display = 'block';
  moveTip(e);
}

export function moveTip(e: { clientX: number; clientY: number }) {
  const t = tipEl();
  const x = Math.min(e.clientX + 14, window.innerWidth - t.offsetWidth - 10);
  const y = e.clientY + 16 + t.offsetHeight > window.innerHeight ? e.clientY - t.offsetHeight - 10 : e.clientY + 16;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
}

export function hideTip() {
  if (atipEl) atipEl.style.display = 'none';
}

export function tippable(html: string) {
  return {
    onMouseEnter: (e: { clientX: number; clientY: number }) => showTip(e, html),
    onMouseMove: moveTip,
    onMouseLeave: hideTip,
  };
}
