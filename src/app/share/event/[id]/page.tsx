import { RESOURCE_URL } from '@/constants';
import Event from '@/views/share/Event';
import type { Metadata } from 'next';
import { capitalizeFLetter } from '@/utils/capitalizeLetter';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const params = await props.params;
    const id = params?.id;
    if (!id) return { title: 'Event Details | Chasescroll' };

    const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://test-api.chasescroll.com';
    const apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');

    const res = await fetchWithTimeout(`${apiBaseUrl}/events/events?id=${id}`, {
      next: { revalidate: 60 },
    }, 5000);

    const data = res.ok ? await res.json() : null;
    const event = data?.content?.[0];

    const title = event?.eventName ? `${capitalizeFLetter(event.eventName)} | Chasescroll` : 'Event Details | Chasescroll';
    const description = event?.eventDescription || 'Join this event on Chasescroll';

    let imageUrl: string | undefined;
    if (event?.picUrls && Array.isArray(event.picUrls) && event.picUrls.length > 0) {
      const firstPic = event.picUrls[0];
      imageUrl = firstPic.startsWith('http') ? firstPic : `${RESOURCE_URL}${firstPic}`;
    } else if (event?.currentPicUrl) {
      imageUrl = event.currentPicUrl.startsWith('http') ? event.currentPicUrl : `${RESOURCE_URL}${event.currentPicUrl}`;
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://share.chasescroll.com/share/event/${id}`,
        type: 'website',
        siteName: 'Chasescroll',
        images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630, alt: title }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    console.error('Metadata generation error in event:', error);
    return {
      title: 'Event Details | Chasescroll',
    };
  }
}

export default async function EventDetailsPage(props: Props) {
  const params = await props.params;
  const searchParams = (await props.searchParams) || {};
  const id = params?.id || '';

  const affiliateID =
    typeof searchParams['affiliate_id'] === 'string'
      ? searchParams['affiliate_id']
      : Array.isArray(searchParams['affiliate_id'])
      ? searchParams['affiliate_id'][0]
      : undefined;

  return <Event id={id} affiliateID={affiliateID} />;
}
