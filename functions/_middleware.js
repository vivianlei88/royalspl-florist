// Middleware: 301 redirect old ?slug= URLs to listing pages
// New site uses ?id= numeric param only; ?slug= causes duplicate content in Google

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // product-detail with ?slug= but no ?id=
  if ((path === '/product-detail' || path === '/product-detail.html') && 
      url.searchParams.has('slug') && !url.searchParams.has('id')) {
    return Response.redirect(new URL('/products.html', request.url), 301);
  }
  
  // en/product-detail with ?slug= but no ?id=
  if ((path === '/en/product-detail' || path === '/en/product-detail.html') && 
      url.searchParams.has('slug') && !url.searchParams.has('id')) {
    return Response.redirect(new URL('/en/products.html', request.url), 301);
  }
  
  // blog-detail with ?slug= but no ?id=
  if ((path === '/blog-detail' || path === '/blog-detail.html') && 
      url.searchParams.has('slug') && !url.searchParams.has('id')) {
    return Response.redirect(new URL('/blog.html', request.url), 301);
  }
  
  // en/blog-detail with ?slug= but no ?id=
  if ((path === '/en/blog-detail' || path === '/en/blog-detail.html') && 
      url.searchParams.has('slug') && !url.searchParams.has('id')) {
    return Response.redirect(new URL('/en/blog.html', request.url), 301);
  }
  
  return context.next();
}
