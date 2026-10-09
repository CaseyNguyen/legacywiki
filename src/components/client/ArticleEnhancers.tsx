'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Highlights the contents-rail entry for the section currently on screen. */
export function TocSpy() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.rail a[data-toc]'));
    const targets = links
      .map((a) => document.getElementById(a.dataset.toc!))
      .filter((el): el is HTMLElement => Boolean(el) && el!.id !== 'top');
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 140;
      let current = 'top';
      for (const el of targets) if (el.getBoundingClientRect().top <= line) current = el.id;
      for (const a of links) a.classList.toggle('is-active', a.dataset.toc === current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

/** Lets phone readers fold sections, like Wikipedia's mobile site. */
export function SectionFolds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as Element | null)?.closest?.('.wsec__fold');
      if (!btn) return;
      const section = btn.closest('.wsec');
      if (!section) return;
      const folded = section.toggleAttribute('data-folded');
      btn.setAttribute('aria-expanded', String(!folded));
      const title = section.querySelector('.wsec__title')?.textContent ?? 'section';
      btn.setAttribute('aria-label', `${folded ? 'Expand' : 'Collapse'} ${title}`);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}

/** One shared tooltip for any element carrying data-tip (chart marks, grid cells). */
export function TipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    let lastEl: Element | null = null;
    const show = (el: Element, x: number, y: number) => {
      lastEl = el;
      setTip({ text: el.getAttribute('data-tip') ?? '', x, y });
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-tip]');
      if (!el) {
        if (lastEl) {
          lastEl = null;
          setTip(null);
        }
        return;
      }
      show(el, e.clientX, e.clientY);
    };
    const onFocus = (e: FocusEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-tip]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      show(el, r.left + r.width / 2, r.bottom);
    };
    const hide = () => {
      lastEl = null;
      setTip(null);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerdown', onMove);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', hide);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerdown', onMove);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', hide);
      window.removeEventListener('scroll', hide);
    };
  }, []);
  if (!tip || !tip.text) return null;
  const left = Math.max(8, Math.min(tip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 272));
  const nearBottom = typeof window !== 'undefined' && tip.y > window.innerHeight - 120;
  const top = nearBottom ? tip.y - 70 : tip.y + 16;
  return (
    <div className="tip" role="tooltip" style={{ left, top }}>
      {tip.text}
    </div>
  );
}

/**
 * Click-to-sort for a server-rendered wikitable. Header cells opt in with
 * data-sort="num" | "text"; body cells may supply data-sort-value.
 */
export function Sortable({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const table = ref.current?.querySelector('table');
    if (!table) return;
    table.classList.add('sortable');
    const heads = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th[data-sort]'));
    heads.forEach((th) => {
      th.tabIndex = 0;
      th.setAttribute('role', 'columnheader');
      th.title = 'Sort';
    });
    const value = (cell: HTMLTableCellElement | undefined, numeric: boolean) => {
      const raw = cell?.dataset.sortValue ?? cell?.textContent ?? '';
      if (!numeric) return raw.trim().toLowerCase();
      const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
      return Number.isNaN(n) ? -Infinity : n;
    };
    const sortBy = (th: HTMLTableCellElement) => {
      const numeric = th.dataset.sort === 'num';
      const current = th.getAttribute('aria-sort');
      const dir = current ? (current === 'descending' ? 'ascending' : 'descending') : numeric ? 'descending' : 'ascending';
      heads.forEach((h) => h.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', dir);
      const index = th.cellIndex;
      const body = table.tBodies[0];
      const rows = Array.from(body.rows);
      rows.sort((a, b) => {
        const va = value(a.cells[index], numeric);
        const vb = value(b.cells[index], numeric);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return dir === 'ascending' ? cmp : -cmp;
      });
      rows.forEach((r) => body.appendChild(r));
    };
    const onClick = (e: Event) => {
      const th = (e.target as Element).closest<HTMLTableCellElement>('th[data-sort]');
      if (th && table.contains(th)) sortBy(th);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const th = (e.target as Element).closest<HTMLTableCellElement>('th[data-sort]');
      if (th && table.contains(th)) {
        e.preventDefault();
        sortBy(th);
      }
    };
    table.addEventListener('click', onClick);
    table.addEventListener('keydown', onKey);
    return () => {
      table.removeEventListener('click', onClick);
      table.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <div className={`tbl${className ? ` ${className}` : ''}`} ref={ref}>
      {children}
    </div>
  );
}
