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
 * Imperatively sets the document title and meta description for the current
 * page (this is a client-rendered SPA, so meta is applied at runtime).
 *
 * Note: we deliberately do NOT emit a robots meta tag. Pages are indexable by
 * default, and non-public paths are kept out of crawling via robots.txt — so no
 * page ever carries a `noindex` tag.
 *
 * @param {string} title        Page title ('' = just the site name).
 * @param {string} description  Unique meta description for the page.
 * @param {object} [opts]
 * @param {boolean} [opts.enabled]  When false, does nothing (lets another owner set meta).
 */
export default function usePageMeta(title, description, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    setMeta('description', description || DEFAULT_DESCRIPTION);
  }, [title, description, enabled]);
}
