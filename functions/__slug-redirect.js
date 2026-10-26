// Redirect URLs with ?slug= param (old WIX format) to proper listing pages
// New site only uses ?id= numeric param for product/blog detail pages

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // product-detail?slug=* -> /products.html (or /en/products.html)
  if (url.pathname === '/product-detail' || url.pathname === '/product-detail.html') {
    if (url.searchParams.has('slug') && !url.searchParams.has('id')) {
      const isEn = url.pathname.startsWith('/en/');
      return Response.redirect(new URL(isEn ? '/en/products.html' : '/products.html', request.url), 301);
    }
  }
  
  // blog-detail?slug=* -> /blog.html (or /en/blog.html)
  if (url.pathname === '/blog-detail' || url.pathname === '/blog-detail.html') {
    if (url.searchParams.has('slug') && !url.searchParams.has('id')) {
      const isEn = url.pathname.startsWith('/en/');
      return Response.redirect(new URL(isEn ? '/en/blog.html' : '/blog.html', request.url), 301);
    }
  }
  
  // Also handle /en/product-detail and /en/blog-detail
  if (url.pathname === '/en/product-detail' || url.pathname === '/en/product-detail.html') {
    if (url.searchParams.has('slug') && !url.searchParams.has('id')) {
      return Response.redirect(new URL('/en/products.html', request.url), 301);
    }
  }
  
  if (url.pathname === '/en/blog-detail' || url.pathname === '/en/blog-detail.html') {
    if (url.searchParams.has('slug') && !url.searchParams.has('id')) {
      return Response.redirect(new URL('/en/blog.html', request.url), 301);
    }
  }
  
  return context.next();
}
