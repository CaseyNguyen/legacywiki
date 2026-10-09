import type { ReactNode } from 'react';

/** A Wikipedia-style h2 section; on phones it gets a fold toggle. */
export function Section({
  id,
  title,
  meta,
  lead,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  /** On phones, show this section before the infobox. */
  lead?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`wsec${lead ? ' wsec--lead' : ''}`} id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        <span className="wsec__title">{title}</span>
        {meta ? <span className="section-meta">{meta}</span> : null}
        <button type="button" className="wsec__fold" aria-expanded="true" aria-controls={`${id}-b`} aria-label={`Collapse ${title}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </h2>
      <div className="wsec__body" id={`${id}-b`}>
        {children}
      </div>
    </section>
  );
}
