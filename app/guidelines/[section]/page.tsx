import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import logo from "@/public/images/safe-rider-logo.png";
import { ASSESSMENT_SECTIONS } from "@/lib/form-content";
import FramedCard from "@/components/FramedCard";
import GuidelinesTable from "@/components/GuidelinesTable";
import { LinkButton } from "@/components/Buttons";

export function generateStaticParams() {
  return ASSESSMENT_SECTIONS.map((s) => ({ section: s.id }));
}

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: id } = await params;
  const section = ASSESSMENT_SECTIONS.find((s) => s.id === id);
  return { title: section ? `${section.title} Guidelines` : "Guidelines" };
}

/** One page per assessment section, like the 2W form's two guideline pages. */
export default async function GuidelinesPage({ params }: Props) {
  const { section: id } = await params;
  const index = ASSESSMENT_SECTIONS.findIndex((s) => s.id === id);
  if (index === -1) notFound();
  const section = ASSESSMENT_SECTIONS[index];
  const prev = ASSESSMENT_SECTIONS[index - 1];
  const next = ASSESSMENT_SECTIONS[index + 1];

  return (
    <main className="px-3 py-6 sm:px-6 sm:py-10">
      <FramedCard>
        <header className="mb-5 flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          <Image src={logo} alt="Safe Rider — Ride safe. Stay safe." className="h-auto w-36 sm:w-44" priority />
          <div className="text-center sm:flex-1 sm:text-left">
            <h1 className="font-poster text-[clamp(1.6rem,5vw,2.6rem)] uppercase leading-none text-brake">Assessment Guidelines</h1>
            <p className="mt-1 text-sm font-medium text-ink-soft">
              {section.title} · for the Line Manager · {index + 1} of {ASSESSMENT_SECTIONS.length}
            </p>
          </div>
        </header>

        <GuidelinesTable section={section} />

        <nav className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <LinkButton href={prev ? `/guidelines/${prev.id}` : "/"} variant="back">
            <ArrowLeft className="h-4 w-4" />
            Previous
          </LinkButton>
          {next ? (
            <LinkButton href={`/guidelines/${next.id}`}>
              Next
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          ) : (
            <LinkButton href="/assessment">
              Start Form
              <ArrowRight className="h-4 w-4" />
            </LinkButton>
          )}
        </nav>
      </FramedCard>
    </main>
  );
}
