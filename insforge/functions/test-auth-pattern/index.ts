// @ts-nocheck
export default async function handler(req: Request): Promise<Response> {
  // Get the function name from the request headers (set by the SDK)
  // For GET requests, the function name is passed in the X-Function-Name header.
  const functionName = req.headers.get('x-function-name');

  if (functionName === 'test-auth-pattern') {
    // Verify if the user is authenticated
    const { user, error } = await insforge.auth.getUser();

    if (error) {
      console.error('Error fetching user:', error);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (user) {
      console.log('User authenticated:', user.email);
      return new Response(JSON.stringify({ success: true, message: `User authenticated: ${user.email}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('No user found');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
