import { RESOURCE_URL } from '@/constants'; 
import Fundraiser from '@/views/share/Fundraiser';
import type { Metadata } from 'next';
import { capitalizeFLetter } from '@/utils/capitalizeLetter';
import { fetchWithTimeout } from '@/utils/fetchWithTimeout';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata(props: Props): Promise<Metadata> {
  try {
    const params = await props.params;
    const id = params?.id;
    if (!id) return { title: 'Fundraiser | Chasescroll' };

    const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://test-api.chasescroll.com';
    const apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');

    const res = await fetchWithTimeout(`${apiBaseUrl}/fund-raiser/search?id=${id}`, {
      method: 'GET',
      next: { revalidate: 60 },
    }, 5000);

    const data = res.ok ? await res.json() : null;
    const event = data?.content?.[0];

    if (!event) {
      return {
        title: 'Fundraiser | Chasescroll',
        description: 'View details of this fundraiser on Chasescroll.',
      };
    }

    const title = event.name ? `${capitalizeFLetter(event.name)} | Chasescroll` : 'Fundraiser | Chasescroll';
    const description = event.description || 'Join this fundraiser on Chasescroll';
    const imageUrl = event.bannerImage ? (event.bannerImage.startsWith('http') ? event.bannerImage : `${RESOURCE_URL}${event.bannerImage}`) : undefined;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://share.chasescroll.com/share/fundraiser/${id}`,
        type: 'website',
        siteName: 'Chasescroll',
        images: imageUrl
          ? [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: event.name,
              },
            ]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (error) {
    console.error('Metadata generation error in fundraiser:', error);
    return {
      title: 'Fundraiser | Chasescroll',
      description: 'View details of this fundraiser on Chasescroll.',
    };
  }
}

export default async function FundraiserPage(props: Props) {
  const params = await props.params; 
  const id = params?.id || ''; 

  return <Fundraiser id={id} />;
}
