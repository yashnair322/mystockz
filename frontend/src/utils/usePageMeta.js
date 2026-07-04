import { useEffect } from 'react';
import { SITE_NAME, DEFAULT_DESCRIPTION } from './seo';

function setMeta(name, content) {
  let tag = document.head.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

/**
 * Imperatively sets the document title, meta description, and robots directive
 * for the current page (this is a client-rendered SPA, so meta is set at runtime).
 *
 * @param {string} title        Page title (empty string = just the site name).
 * @param {string} description  Unique meta description for the page.
 * @param {object} [opts]
 * @param {boolean} [opts.noindex]  Emit `noindex, nofollow` for private pages.
 * @param {boolean} [opts.enabled]  When false, does nothing (lets another owner set meta).
 */
export default function usePageMeta(title, description, { noindex = false, enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    setMeta('description', description || DEFAULT_DESCRIPTION);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, noindex, enabled]);
}
