import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for admin routes, API routes, and standalone pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname.startsWith('/consentimiento') || pathname.startsWith('/empleada')) {
    return NextResponse.next();
  }

  // If root path, redirect to /es
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/es', request.url));
  }

  // Check if the pathname already starts with a locale
  const locales = ['es', 'ca'];
  const pathnameStartsWithLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameStartsWithLocale) {
    return NextResponse.next();
  }

  // If no locale, redirect to Spanish version
  return NextResponse.redirect(
    new URL(`/es${pathname}`, request.url)
  );
}

export const config = {
  matcher: ['/((?!api|_next|static|public|.*\\..*).*)']
};
