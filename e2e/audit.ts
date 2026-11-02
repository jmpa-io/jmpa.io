import type { Page } from '@playwright/test';

export type Failure = { text: string; ratio: number; fg: string; bg: string; tag: string };

// Walks every visible text-bearing element, resolves fg/effective bg to sRGB and returns those below `min`.
export async function contrastFailures(page: Page, min = 4.5, root = 'body'): Promise<Failure[]> {
  return page.evaluate(
    ({ min, root }) => {
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
      const rgba = (css: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = '#000';
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const lin = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const bgOf = (el: Element | null): number[] => {
        for (let e = el; e; e = e.parentElement) {
          const c = rgba(getComputedStyle(e).backgroundColor);
          if (c[3] > 0.95) return c;
        }
        return rgba(getComputedStyle(document.documentElement).colorScheme === 'dark' ? '#000' : '#fff');
      };
      const out: any[] = [];
      const seen = new Set<Element>();
      const walker = document.createTreeWalker(document.querySelector(root)!, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || seen.has(el) || !n.textContent!.trim()) continue;
        seen.add(el);
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0 || r.width === 0 || r.height === 0) continue;
        if (el.closest('script,style,svg,[hidden],.sr-only')) continue;
        const fg = rgba(st.color);
        const bg = bgOf(el);
        const [a, b] = [lum(fg), lum(bg)];
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        if (ratio < min) out.push({ text: n.textContent!.trim().slice(0, 40), ratio: +ratio.toFixed(2), fg: st.color, bg: `rgb(${bg.slice(0, 3)})`, tag: el.tagName + '.' + el.className });
      }
      (window as any).__auditCount = seen.size;
      return out;
    },
    { min, root },
  );
}
