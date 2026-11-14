import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/profile";

export const metadata: Metadata = { title: "How this demo works" };

export default function About() {
  const h2 = "heading mt-9";
  const p = "mt-3 leading-relaxed";
  return (
    <main className="mx-auto w-full max-w-[86rem] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <article className="panel max-w-[50rem] px-5 py-7 sm:px-10 sm:py-10">
      <h1 className="display">How this demo works</h1>
      <p className="mt-4 text-lg leading-relaxed">
        This is a demonstration build by ChopMedia. It is not client work, and nothing in it is real: {COMPANY.name} is a fictional contractor, and every agency, solicitation, addendum, name,
        address and phone number was invented for the demo.
      </p>

      <h2 className={h2}>What it shows</h2>
      <p className={p}>
        A small contractor that wants government work has to find the solicitations that suit it, read thirty pages to learn what a bid must contain, and then keep watching, because agencies
        change the terms by addendum and a bid that misses one is thrown out. This demo does those three things: it matches, it reads, and it watches.
      </p>

      <h2 className={h2}>Recorded: the AI reading</h2>
      <p className={p}>
        Each solicitation and addendum was given, as text, to Claude, an AI model made by Anthropic, with a fixed set of instructions. What it wrote was saved: the summary, the dates and
        requirements, the checklist, its notes, and for every item the section and the exact words it was read from. The demo replays those saved readings. They were not tidied up by hand
        afterwards. The demo does not call an AI model while you use it, which is why it runs with no key and at no cost, and why you cannot add a solicitation of your own here.
      </p>
      <p className={p}>
        There are no confidence scores on the screen because the model gave none and none were invented. What you get instead is the source: click an item and the solicitation shows where it
        says so. A test in the code checks that every quoted passage really is in the section it points to.
      </p>

      <h2 className={h2}>Scripted: what arrives each morning</h2>
      <p className={p}>
        The demo runs on its own calendar, starting at 7:00 AM on Monday, March 1, 2027, so the deadlines are always ahead of you. <em>Skip to next morning</em> moves it on one working day.
        Which solicitations and addenda turn up on which morning is fixed in advance. In a real build they come from the agencies&rsquo; own feeds, and the distance to each job comes from a
        mapping service; here both are typed in.
      </p>

      <h2 className={h2}>Real: everything else</h2>
      <p className={p}>
        The fit rules are ordinary written rules, not AI. They compare what was read from a solicitation with the{" "}
        <Link href="/profile" className="link">
          company profile
        </Link>{" "}
        and give their reasons. Laying an addendum over the original, showing what changed, adding its requirements to the checklist, refusing to mark a bid as handed in while an addendum is
        unread or something is missing, the pipeline and the history: all of that runs live, on your own private copy of the sample data. <em>Reset demo</em> puts it back.
      </p>

      <h2 className={h2}>What it is not</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
        <li>It is not connected to SAM.gov, a state purchasing portal or any agency, and it is not affiliated with one.</li>
        <li>It is not legal or procurement advice. An AI reading can miss or misread a requirement. The solicitation and its addenda are what count, which is why they are always on the screen.</li>
        <li>It does not write the proposal or price the job.</li>
        <li>It is not a measure of accuracy. Fourteen invented solicitations say nothing about how a model does on real ones. A real project starts by testing it on yours.</li>
      </ul>

      <h2 className={h2}>Your copy</h2>
      <p className={p}>
        Each visitor gets a private copy of the sample data, so what you decide here is seen by nobody else. One cookie remembers which copy is yours. It holds a random id and nothing about
        you, and the copy is deleted after two days.
      </p>

      <p className="mt-10 border-t border-line pt-6 leading-relaxed">
        Built by ChopMedia. Contact Hayden Huelskamp at{" "}
        <a href="mailto:chopscales@gmail.com" className="link">
          chopscales@gmail.com
        </a>
        , or on{" "}
        <a href="https://www.linkedin.com/in/hayden-huelskamp-547a86302/" className="link">
          LinkedIn
        </a>
        .
      </p>
      </article>
    </main>
  );
}
