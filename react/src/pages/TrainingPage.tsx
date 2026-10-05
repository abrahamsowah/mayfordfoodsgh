import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChefHat,
  Clock,
  Eye,
  GraduationCap,
  Mail,
  Printer,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { api } from '../api';
import {
  Alert,
  Btn,
  Card,
  Field,
  HeroSmall,
  Input,
  Section,
  SectionHeader,
  Select,
  Textarea,
} from '../components/ui';
import { SmartImage } from '../components/SmartImage';

const TRACKS = [
  {
    title: 'West African & Continental Culinary Arts',
    school: 'School of Culinary Arts',
    defaultProgram: 'Professional Chef Training (3-Month Certificate)',
    duration: '3 Months / 6 Months',
    level: 'Beginner to Professional',
    img: '/assets/images/outsidecater3.jpeg',
    icon: ChefHat,
    modules: [
      'Authentic Ghanaian sauces, soups, and smokehouse techniques',
      'Commercial kitchen workflow, mise en place, and portion control',
      'Continental plating, grilling, and protein mastery',
      'Food safety, HACCP hygiene, and allergen management',
    ],
  },
  {
    title: 'Pastry, Bakery & Confectionery Mastery',
    school: 'School of Culinary Arts',
    defaultProgram: 'Artisan Baking & Pastry (6 Weeks)',
    duration: '6 Weeks Practical',
    level: 'All Skill Levels',
    img: '/assets/images/samosa.jpg',
    icon: UtensilsCrossed,
    modules: [
      'Artisan bread making, lamination, and savoury pastries',
      'Event cakes, celebration desserts, and ganache finishing',
      'Ghanaian snacks, meat pies, and high-volume bakery production',
      'Recipe costing, bakery equipment care, and packaging',
    ],
  },
  {
    title: 'Restaurant Operations & Food Business Management',
    school: 'School of Restaurant Management',
    defaultProgram: 'Restaurant Operations & Food Business (6 Weeks)',
    duration: '6 Weeks Intensive',
    level: 'Entrepreneurs & Managers',
    img: '/assets/images/outsidecater4.jpeg',
    icon: BookOpen,
    modules: [
      'Outlet management, customer service, and food safety standards',
      'Restaurant startup planning, pricing, and financial controls',
      'Inventory management, kitchen yield, and waste reduction',
      'Digital ordering, delivery logistics, and brand marketing',
    ],
  },
  {
    title: 'Hospitality Leadership & Front Office Excellence',
    school: 'School of Hospitality Excellence',
    defaultProgram: 'Hospitality Leadership & Service Excellence (4 Weeks)',
    duration: '4 Weeks Executive',
    level: 'Supervisors & Staff',
    img: '/assets/images/outsidecater1.jpeg',
    icon: Award,
    modules: [
      'Front office systems, guest relations, and service recovery',
      'Customer experience design and professional etiquette',
      'Hospitality team leadership, mentorship, and staffing',
      'Banquet planning, corporate catering, and VIP service',
    ],
  },
];

const PROGRAMMES_BY_SCHOOL: Record<string, string[]> = {
  'School of Culinary Arts': [
    'Professional Chef Training (3-Month Certificate)',
    'Diploma in West African & Continental Cuisine (6 Months)',
    'Artisan Baking & Pastry (6 Weeks)',
    'Traditional Ghanaian Commercial Cookery (4 Weeks)',
    'Executive Weekend Culinary Bootcamp (4 Weeks)',
  ],
  'School of Restaurant Management': [
    'Restaurant Operations & Food Business (6 Weeks)',
    'Food Costing, Pricing & Inventory Mastery (3 Weeks)',
    'Event Catering Logistics & Banquet Management (4 Weeks)',
  ],
  'School of Hospitality Excellence': [
    'Hospitality Leadership & Service Excellence (4 Weeks)',
    'Front Office Operations & Guest Relations (3 Weeks)',
    'Customer Care & Service Recovery Masterclass (2 Weeks)',
  ],
};

const ALL_PROGRAMMES = Object.values(PROGRAMMES_BY_SCHOOL).flat();

interface ConfirmationPayload {
  id: number;
  application_ref: string;
  full_name: string;
  email: string;
  phone: string;
  training_school: string;
  program: string;
  confirmation_email_html: string;
}

export default function TrainingPage() {
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    training_school: '',
    program: '',
    message: '',
  });
  const [status, setStatus] = useState<{ kind: 'green' | 'red'; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationPayload | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(true);

  const availableProgrammes = form.training_school
    ? PROGRAMMES_BY_SCHOOL[form.training_school] || ALL_PROGRAMMES
    : ALL_PROGRAMMES;

  const handleSchoolChange = (school: string) => {
    const schoolProgs = PROGRAMMES_BY_SCHOOL[school] || [];
    const nextProgram = schoolProgs.includes(form.program) ? form.program : schoolProgs[0] || '';
    setForm({
      ...form,
      training_school: school,
      program: nextProgram,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await api.post<{
        ok: boolean;
        id: number;
        application_ref: string;
        email_sent: boolean;
        confirmation_email_html: string;
      }>('/training-applications', form);
      setConfirmation({
        id: res.id,
        application_ref: res.application_ref,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        training_school: form.training_school,
        program: form.program,
        confirmation_email_html: res.confirmation_email_html,
      });
      setStatus({
        kind: 'green',
        msg: `Application ${res.application_ref} received! A branded confirmation email has been sent to ${form.email}.`,
      });
      setForm({ full_name: '', phone: '', email: '', training_school: '', program: '', message: '' });
    } catch (err) {
      setStatus({ kind: 'red', msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <HeroSmall
        eyebrow="Mayford Training Academy"
        title="Culinary Arts & Hospitality Education"
        text="Practical culinary arts, commercial kitchen operations, and hospitality leadership training taught inside active Accra kitchens."
        image="/assets/images/trainingpic.png"
      />

      {/* Academy Highlights */}
      <div className="border-b border-neutral-200 bg-[#111111] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { value: '70% Practical', label: 'Commercial Kitchen Immersion' },
            { value: '3 Schools', label: 'Specialized Training Tracks' },
            { value: 'Small Cohorts', label: 'Direct Chef Mentorship' },
            { value: 'Accra Based', label: 'Adabraka & Dzorwulu Campuses' },
          ].map((stat) => (
            <div key={stat.label} className="border-l-2 border-mayford-500 pl-4">
              <div className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-neutral-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Training Tracks */}
      <Section tone="white">
        <SectionHeader
          eyebrow="Academic Curriculum"
          title="Practical Career Pathways"
          text="Every student trains with commercial equipment, standardized recipes, and real kitchen service deadlines."
        />

        <div className="grid gap-6 md:grid-cols-2">
          {TRACKS.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.title} className="flex flex-col overflow-hidden">
                <div className="relative h-52 overflow-hidden bg-neutral-100">
                  <SmartImage
                    src={t.img}
                    alt={t.title}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    fallbackSrc="/assets/images/hero.png"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    <span className="rounded bg-[#111111] px-2.5 py-1 text-xs font-semibold text-white">
                      {t.school}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-semibold text-[#111111]">
                      <Clock className="h-3 w-3 text-mayford-600" /> {t.duration}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#111111]">{t.title}</h3>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FAF7F0] text-[#111111]">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-mayford-600">
                    {t.level}
                  </p>

                  <ul className="mb-6 flex-1 space-y-2">
                    {t.modules.map((m) => (
                      <li key={m} className="flex items-start gap-2 text-xs text-[#6B6B6B]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#apply"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        training_school: t.school,
                        program: t.defaultProgram,
                      }))
                    }
                    className="inline-flex items-center gap-1.5 border-t border-neutral-100 pt-3 text-xs font-semibold text-[#111111] hover:text-mayford-600"
                  >
                    <span>Apply for this programme</span>
                    <Sparkles className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* Application Form + Branded Email Confirmation */}
      <Section tone="default" id="apply">
        <div className="grid items-start gap-10 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#111111] text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
              Apply for the Next Cohort
            </h2>
            <p className="text-sm leading-relaxed text-[#6B6B6B]">
              Select your preferred department and training programme from the dropdown menu below. You will immediately receive a branded admission confirmation email with your official application reference code, and our Admissions Office will follow up within 48 hours.
            </p>
            <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5 text-xs text-[#6B6B6B]">
              <div className="font-bold text-[#111111]">What is Included in Admission:</div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Mayford Academy Chef Jacket, Apron &amp; Practical Manual</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>All Fresh Ingredients &amp; Commercial Kitchen Equipment</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Branded Email Confirmation &amp; Admissions Advisor Follow-Up</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Graduating Practical Assessment &amp; Mayford Certificate</span>
              </div>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-7">
            <Card className="p-6 sm:p-8">
              <h3 className="mb-1 text-xl font-bold text-[#111111]">Student Admission Form</h3>
              <p className="mb-6 text-xs text-[#6B6B6B]">
                All fields are required for admissions review and email confirmation dispatch.
              </p>

              {status && (
                <div className="mb-6">
                  <Alert tone={status.kind}>{status.msg}</Alert>
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Applicant Full Name">
                    <Input
                      required
                      placeholder="e.g. Akosua Boateng"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    />
                  </Field>
                  <Field label="Phone / WhatsApp Number">
                    <Input
                      required
                      placeholder="024 000 0000"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email Address (for Branded Confirmation)">
                    <Input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </Field>
                  <Field label="Training School">
                    <Select
                      required
                      value={form.training_school}
                      onChange={(e) => handleSchoolChange(e.target.value)}
                    >
                      <option value="">Select Training School</option>
                      <option value="School of Culinary Arts">School of Culinary Arts</option>
                      <option value="School of Restaurant Management">School of Restaurant Management</option>
                      <option value="School of Hospitality Excellence">School of Hospitality Excellence</option>
                    </Select>
                  </Field>
                </div>

                <Field label="Preferred Programme (Select from Accredited Tracks)">
                  <Select
                    required
                    value={form.program}
                    onChange={(e) => {
                      const chosen = e.target.value;
                      let matchedSchool = form.training_school;
                      if (!matchedSchool && chosen) {
                        for (const [sch, list] of Object.entries(PROGRAMMES_BY_SCHOOL)) {
                          if (list.includes(chosen)) {
                            matchedSchool = sch;
                            break;
                          }
                        }
                      }
                      setForm({ ...form, program: chosen, training_school: matchedSchool });
                    }}
                  >
                    <option value="">Select Preferred Programme</option>
                    {availableProgrammes.map((prog) => (
                      <option key={prog} value={prog}>
                        {prog}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Why Do You Want to Join? (Optional)">
                  <Textarea
                    placeholder="Share your culinary goals, background, or preferred schedule..."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </Field>

                <Btn type="submit" variant="red" disabled={submitting} className="w-full !py-3">
                  <span>{submitting ? 'Submitting & Dispatching Confirmation...' : 'Submit Training Application'}</span>
                </Btn>
              </form>
            </Card>

            {confirmation && (
              <Card className="border-emerald-300 bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-[#111111]">
                          Branded Confirmation Email Dispatched
                        </h4>
                        <span className="font-mono rounded bg-[#111111] px-2 py-0.5 text-xs font-bold text-white">
                          {confirmation.application_ref}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6B6B6B]">
                        Sent to <strong>{confirmation.email}</strong> · Logged in Mayford Admissions CRM for staff follow-up
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Btn
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmailPreview((v) => !v)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{showEmailPreview ? 'Hide Email Copy' : 'View Email Copy'}</span>
                    </Btn>
                    <Btn
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Print</span>
                    </Btn>
                  </div>
                </div>

                {showEmailPreview && (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                      Branded Confirmation Email Preview
                    </div>
                    <div
                      className="overflow-hidden rounded-md border border-neutral-200 bg-neutral-50"
                      dangerouslySetInnerHTML={{ __html: confirmation.confirmation_email_html }}
                    />
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
