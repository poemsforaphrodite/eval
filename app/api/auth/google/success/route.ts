import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    // Set cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', req.url));
    response.cookies.set('username', email as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Error in success handler:", error);
    return NextResponse.redirect(new URL('/login?error=SuccessHandlerFailed', req.url));
  }
}
