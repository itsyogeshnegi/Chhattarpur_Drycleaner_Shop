import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
  response.cookies.set('alharam_token', '', {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: '/',
  });
  return response;
}

