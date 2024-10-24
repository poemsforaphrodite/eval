import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();

  // Remove the 'username' cookie
  cookieStore.delete('username');

  // Optionally, remove other cookies if needed
  // cookieStore.delete('anotherCookieName');

  // Redirect to the login page
  return NextResponse.redirect('/login');
}
