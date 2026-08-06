import { NextRequest, NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

const DAILY_API_KEY = process.env.DAILY_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { interviewId } = await req.json();

    if (!interviewId) {
      return NextResponse.json({ error: 'Interview ID is required' }, { status: 400 });
    }

    // 1. Fetch interview to see if room already exists
    const { data: interview, error: fetchError } = await insforge.database
      .from('interviews')
      .select('meeting_link')
      .eq('id', interviewId)
      .single();

    if (fetchError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    let roomUrl = interview.meeting_link;

    // 2. Create room if it doesn't exist
    if (!roomUrl) {
      if (!DAILY_API_KEY) {
        // Mock room for development if API key is missing
        roomUrl = `https://talentmesh.daily.co/mock-room-${interviewId}`;
      } else {
        const roomRes = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `interview-${interviewId}`,
            properties: {
              enable_chat: true,
              enable_knocking: false,
              exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
            }
          })
        });

        const roomData = await roomRes.json();
        if (!roomRes.ok) throw new Error(roomData.info || 'Failed to create Daily room');
        roomUrl = roomData.url;
      }

      // Store in DB
      await insforge.database
        .from('interviews')
        .update({ meeting_link: roomUrl })
        .eq('id', interviewId);
    }

    // 3. Generate a joining token (optional but recommended for secure rooms)
    let token = '';
    if (DAILY_API_KEY && roomUrl && !roomUrl.includes('mock-room')) {
        const tokenRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              room_name: `interview-${interviewId}`,
              is_owner: false,
            }
          })
        });
        const tokenData = await tokenRes.json();
        token = tokenData.token || '';
    }

    return NextResponse.json({ 
      roomUrl, 
      token,
      isMock: !DAILY_API_KEY 
    });

  } catch (error: any) {
    console.error('Daily API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
