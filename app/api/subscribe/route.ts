import Mailjet from 'node-mailjet';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const mailjet = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY || '',
      apiSecret: process.env.MAILJET_API_SECRET || ''
    });

    // Add contact to your Mailjet contact list
    await mailjet.post('contact', { version: 'v3' }).request({
      Email: email,
      IsExcludedFromCampaigns: false,
    });

    // Optional: Add contact to a specific list
    if (process.env.MAILJET_LIST_ID) {
      await mailjet.post('listrecipient', { version: 'v3' }).request({
        ContactAlt: email,
        ListID: process.env.MAILJET_LIST_ID,
      });
    }

    return NextResponse.json(
      { message: 'Subscription successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    );
  }
} 