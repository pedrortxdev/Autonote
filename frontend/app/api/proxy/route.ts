import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/api/login';
  
  try {
    // Get content type
    const contentType = req.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');

    let body: any;
    let headers: Record<string, string> = {};

    if (isFormData) {
      // Forward FormData as-is
      body = await req.formData();
      // Don't set Content-Type - let browser set it with boundary
    } else {
      // JSON request - read as text first to avoid parsing issues
      const text = await req.text();
      console.log('Proxy received text:', text, 'content-type:', contentType);
      headers['Content-Type'] = 'application/json';
      body = text || '{}';
    }

    // Add auth header if present
    const auth = req.headers.get('authorization');
    if (auth) {
      headers['Authorization'] = auth;
    }

    const targetUrl = `http://localhost:8080${path}`;
    console.log('Proxy forwarding to:', targetUrl, 'body:', body);
    
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });
    
    const data = await res.json().catch(() => ({}));
    console.log('Proxy response:', data);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Proxy POST error:', e);
    return NextResponse.json({ error: 'Proxy failed', details: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    const res = await fetch(`http://localhost:8080${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error('Proxy error:', e);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
