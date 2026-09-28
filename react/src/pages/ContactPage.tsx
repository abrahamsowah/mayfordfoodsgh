import { Clock, Mail, Music, Phone } from 'lucide-react';
import { useSettings } from '../components/SiteLayout';
import { Reveal } from '../components/motion';
import { Card, Eyebrow, FacebookIcon, LinkBtn, Section, SectionHeader } from '../components/ui';
import { waLink } from '../utils';

export default function ContactPage() {
  const { settings } = useSettings();
  const adabraka = settings?.adabraka_phone || '0244143271';
  const dzorwulu = settings?.dzorwulu_phone || '0533634378';

  return (
    <>
      <Section>
        <div className="mb-12 text-center">
          <Eyebrow>We'd Love To Hear From You</Eyebrow>
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">Contact Mayford Foods</h1>
          <p className="mx-auto mt-4 max-w-xl text-stone-600">
            We are always ready to serve you. Contact us through WhatsApp, Email, Social Media or visit any of our
            branches.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal>
            <Card className="h-full p-7 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                <Mail className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold tracking-tight text-stone-900">Email</h3>
              <p className="mt-2 break-all text-sm text-stone-600">{settings?.email || 'mayfordfoods@gmail.com'}</p>
            </Card>
          </Reveal>
          <Reveal delay={80}>
            <Card className="h-full p-7 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                <Clock className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold tracking-tight text-stone-900">Opening Hours</h3>
              <p className="mt-2 text-sm text-stone-600">Monday to Sunday</p>
              <p className="text-sm font-bold text-stone-800">9:00 AM to 9:30 PM</p>
            </Card>
          </Reveal>
          <Reveal delay={160}>
            <Card className="h-full p-7 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                <Phone className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold tracking-tight text-stone-900">Mayford Locals</h3>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-stone-400">Adabraka Branch</p>
              <p className="my-2 text-sm font-bold text-stone-800">{adabraka}</p>
              <LinkBtn
                href={waLink(adabraka)}
                external
                className="!bg-whatsapp hover:!bg-whatsapp-dark"
              >
                WhatsApp
              </LinkBtn>
            </Card>
          </Reveal>
          <Reveal delay={240}>
            <Card className="h-full p-7 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                <Phone className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-extrabold tracking-tight text-stone-900">
                Mayford Fast Food Outlets
              </h3>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-stone-400">Dzorwulu Branch</p>
              <p className="my-2 text-sm font-bold text-stone-800">{dzorwulu}</p>
              <LinkBtn
                href={waLink(dzorwulu)}
                external
                className="!bg-whatsapp hover:!bg-whatsapp-dark"
              >
                WhatsApp
              </LinkBtn>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section tone="white">
        <SectionHeader
          eyebrow="Stay Connected"
          title={
            <>
              Follow Us <span className="text-flame-600">On Social Media</span>
            </>
          }
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <Card className="p-9 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                <FacebookIcon className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight text-stone-900">Facebook</h3>
              <div className="mt-5">
                <LinkBtn
                  variant="dark"
                  href={settings?.facebook_link || 'https://www.facebook.com/'}
                  external
                >
                  Visit Facebook
                </LinkBtn>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={100}>
            <Card className="p-9 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-mayford-600 text-white shadow-glow">
                <Music className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight text-stone-900">TikTok</h3>
              <div className="mt-5">
                <LinkBtn
                  variant="dark"
                  href={settings?.tiktok_link || 'https://www.tiktok.com/'}
                  external
                >
                  Visit TikTok
                </LinkBtn>
              </div>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Delivery To Your Door"
          title={
            <>
              Order On <span className="text-flame-600">Bolt Food</span>
            </>
          }
          text="Get your Mayford Foods favourites delivered through the Bolt Food app."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <Card className="p-9 text-center">
              <h3 className="text-xl font-extrabold tracking-tight text-stone-900">Adabraka Branch</h3>
              <div className="mt-5">
                <LinkBtn
                  href="https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/"
                  external
                >
                  Order Now
                </LinkBtn>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={100}>
            <Card className="p-9 text-center">
              <h3 className="text-xl font-extrabold tracking-tight text-stone-900">Dzorwulu Branch</h3>
              <div className="mt-5">
                <LinkBtn
                  href="https://food.bolt.eu/en/137-accra/p/13426-mayford-fast-food-dzorwulu/"
                  external
                >
                  Order Now
                </LinkBtn>
              </div>
            </Card>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
