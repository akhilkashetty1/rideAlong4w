/**
 * Every word of the form lives here — titles, questions, guidelines and
 * the detail fields. The guidelines pages, the form, the review screen, the
 * PDF, the email and the Google Sheet row are all generated from this file,
 * so content changes never require touching components.
 *
 * Source: "Ride Along 4 Wheeler New.xlsx" + "assessment Guidlines.pdf" from
 * the client. Spelling and grammar typos are corrected, and the "How is the
 * key / seat condition?" questions are phrased as Yes/No so "Yes" always
 * means good. Wording is otherwise the client's.
 *
 * Question `id`s are stable keys stored with each answer. Change the text
 * freely, but give a question a new id only when it means something new.
 */

export type YesNo = "Yes" | "No";

export type Question = {
  id: string;
  text: string;
  /** "Assessment Procedure" column — shown on the guidelines page and under the question. */
  guideline: string;
  /** The answer that means "all good". Anything else is flagged. Defaults to "Yes". */
  expected?: YesNo;
  /** Draws a small diagram next to the question. */
  illustration?: "steering-grip";
  /**
   * Extra details asked only for one answer, shown right under the question (e.g. the
   * documents' valid-till dates when the answer is Yes). All of them are required then.
   */
  followUp?: { when: YesNo; fields: { id: string; label: string; kind: "date" }[] };
};

export type AssessmentSection = {
  id: string;
  title: string;
  /** Step pill label, as on the two-wheeler form. */
  stepLabel: string;
  /** Sheet column prefix. */
  shortTitle: string;
  questions: Question[];
};

type FieldBase = {
  id: string;
  label: string;
  required?: boolean;
  /** Only show (and only validate / submit) when another field has this value. */
  showIf?: { field: string; equals: string };
};

export type FieldDef =
  | (FieldBase & { kind: "text"; placeholder?: string; maxLength?: number })
  | (FieldBase & { kind: "select"; options: string[] | { dependsOn: string; map: Record<string, string[]> } })
  | (FieldBase & { kind: "radio"; options: string[] });

export const FORM_META = {
  title: "Four Wheeler Ride Along Form",
  shortTitle: "4W Ride Along",
  posterTitle: ["Ride Along Assessment", "Four Wheeler"],
  description: "Line manager ride along assessment of a four wheeler and its driver.",
  confirmation:
    "I confirm that I have personally checked and verified the assessment details of the vehicle and the driver.",
  thankYou: { line: "For Completing Ride Along Assessment", sign: "Take Care - Drive Safe" },
  remarkMaxLength: 175,
  /**
   * Every question starts unanswered, so the line manager has to make an explicit
   * Yes/No choice on each one (client request: a pre-filled "all good" answer could be
   * left untouched without really checking). Set true to start every question on its
   * "all good" answer instead, like the two-wheeler form.
   */
  prefillExpectedAnswers: false,
};

/** Asked at the top of the first step, as on the two-wheeler form. */
export const PARTICIPANT_FIELDS: FieldDef[] = [
  { kind: "text", id: "hq", label: "HQ", required: true, maxLength: 80 },
  { kind: "text", id: "name", label: "Name", required: true, maxLength: 80 },
  { kind: "text", id: "team", label: "Team", required: true, maxLength: 80 },
  { kind: "text", id: "lineManager", label: "Line Manager", required: true, maxLength: 80 },
];

export const ASSESSMENT_SECTIONS: AssessmentSection[] = [
  {
    id: "vehicle",
    title: "Vehicle Assessment",
    stepLabel: "Vehicle Assessment",
    shortTitle: "Vehicle",
    questions: [
      {
        id: "tyre-pressure",
        text: "Is the vehicle tyre pressure correct?",
        guideline:
          "Instruct the employee to check tyre pressure at a fuel station and ensure air is filled according to the manufacturer's instructions.",
      },
      {
        id: "tyre-tread",
        text: "How is the treading condition of the tyres? Are there any cuts?",
        guideline: "Check tyres thoroughly by inspecting the tread depth. Check for cuts, splits or bulges.",
      },
      {
        id: "lights",
        text: "Are the headlights, tail lights and hazard lights working properly?",
        guideline:
          "Turn on the low and high beam switch to verify if both are working. Press the brake pedal and check if the brake lights illuminate brightly. Test the hazard switch if the lights are working well.",
      },
      {
        id: "indicators",
        text: "Are the indicators working properly?",
        guideline: "Test the turn signals and verify if all the indicators are functioning properly.",
      },
      {
        id: "wipers",
        text: "Are the windshield wipers functioning properly?",
        guideline:
          "Maintaining properly functioning wipers is crucial for safe driving. Turn the wiper switch and check if the wipers are working properly without any mechanical issues.",
      },
      {
        id: "seatbelts",
        text: "Are the seatbelts present and in good condition?",
        guideline: "Check for any physical damage to the belt. Pull it to make sure the belt clips and unlatches freely.",
      },
      {
        id: "speedometer",
        text: "Is the speedometer functioning properly?",
        guideline:
          "Test drive the vehicle from Point A to Point B and check if the speedometer is functioning. The distance covered should reflect in the meter reading & the speedo needle shows the speed of the vehicle.",
      },
      {
        id: "fuel-meter",
        text: "Is the fuel meter functioning properly?",
        guideline:
          "Turn on the ignition and observe the needle on the fuel gauge, check if it moves. The reading of the fuel meter should match the fuel present in the vehicle.",
      },
      {
        id: "mirrors",
        text: "Are the mirrors present? Are they positioned properly as per the driver's eye line?",
        guideline:
          "Check physically if all the three mirrors are present. The mirrors should be accurately aligned to the eye line of the driver while sitting in driving position.",
      },
      {
        id: "brakes",
        text: "Do the brakes function properly?",
        guideline:
          "Test drive the vehicle and check if the brakes are effective when applied. Brake should not be too soft. Observe brake squeaking noise if any.",
      },
      {
        id: "horn",
        text: "Is the horn functioning properly?",
        guideline:
          "Gently press the horn button and check if the horn is functioning properly. The sound output should be clear and audible. Highlight if the horn is extremely loud or musical.",
      },
      {
        id: "key",
        text: "Is the vehicle key in good condition?",
        guideline:
          "Check the physical condition of the key and verify if all the functions are working properly. Highlight if any dents or rust in the key.",
      },
      {
        id: "seat",
        text: "Is the seat condition of the vehicle good? Check for any damages / cuts.",
        guideline:
          "Check the seat condition by gently pressing the seat, highlight if the seat is too hard or worn out. Seat should be soft and comfortable to avoid back aches. Check for any cuts or damages.",
      },
      {
        id: "spare-tyre",
        text: "Is there a spare tyre present in the vehicle? Is it in a good condition?",
        guideline:
          "Check if a spare tyre is present in the vehicle. Inspect the condition of the wheel. Highlight if spare tyre is not present.",
      },
      {
        id: "kits",
        text: "Is there a tool kit and first aid kit present in the vehicle?",
        guideline: "Carrying a tool kit and a medical kit is very essential and important. Check the validity of the medical kit.",
      },
      {
        id: "number-plates",
        text: "Are the number plates of the vehicle clearly visible?",
        guideline:
          "All the characters in the number plates should be clear and visible. It is illegal to use illegible or stylish fonts. It is mandatory to use HSRP number plates as per Govt regulation.",
      },
      {
        id: "interior",
        text: "Is the interior of the vehicle clean?",
        guideline:
          "Check for empty food packets and water bottles on the seats or the car floor. Bottles on the car floor are dangerous as they may roll and get lodged under the brake and other pedals causing accidents.",
      },
    ],
  },
  {
    id: "driver",
    title: "Driver Assessment",
    stepLabel: "Driver Safety",
    shortTitle: "Driver",
    questions: [
      {
        id: "indicator-use",
        text: "Does the driver use the indicator while taking a turn?",
        guideline:
          "Check if the driver uses indicators while taking turns on the road. Indicators are of prime importance while taking turns, overtaking and switching lanes. It's an integral part of road safety.",
      },
      {
        id: "overtaking",
        text: "Does the driver overtake from the correct side?",
        guideline:
          "Indian traffic rules require the driver to drive on the left side of the road. This means that overtaking is permitted only from the right.",
      },
      {
        id: "seat-belt-use",
        text: "Does the driver use the seat belt while driving?",
        guideline:
          "It is mandatory to use a seat belt as per law. It protects the driver from injuries. Highlight if the driver is not using the seat belt.",
      },
      {
        id: "sleepy",
        text: "Is the driver sleepy while driving?",
        guideline:
          "Yawning and drooping eyelids while driving are signs of a tired / sleepy driver. Unstable steering pattern movements indicate drowsiness.",
        expected: "No",
      },
      {
        id: "traffic-signals",
        text: "Does the driver stop at traffic signals?",
        guideline:
          "Driver should stop at a red light and slow down at a yellow light. Signal jumping violations can be checked on traffic police websites, UPI apps / mParivahan app etc.",
      },
      {
        id: "mobile-phone",
        text: "Does the driver use a mobile phone while driving?",
        guideline:
          "Usage of a mobile phone while driving is illegal and is not suggested for safety purposes as it may cause distractions while driving.",
        expected: "No",
      },
      {
        id: "speed-limits",
        text: "Does the driver follow legal speed limits?",
        guideline:
          "Speed limit ranges from 40-60 kmph within city limits. Speed limit varies with every state in India. Following stipulated speed limits keeps the driver and roads safe for all users.",
      },
      {
        id: "lane-discipline",
        text: "Does the driver maintain lane discipline?",
        guideline:
          "Adhering to lane discipline contributes to an overall safer driving environment. Signalling while changing lanes improves road safety.",
      },
      {
        id: "ambulance",
        text: "Does the driver make way for an ambulance?",
        guideline:
          "Driver must slow down and check the traffic around the vehicle and move to the left giving way to the ambulance on the right side of the road.",
      },
      {
        id: "courtesy",
        text: "Is the driver courteous to other road users?",
        guideline:
          "A driver must always be alert and make way for other vehicles on roads. Driver must slow down at pedestrian crossings, school zones etc. Rash driving may lead to fatal accidents to the driver and other motorists on the roads.",
      },
      {
        id: "steering-grip",
        text: "Does the driver grip the steering wheel in the right position?",
        guideline:
          "For maximum steering control it is highly recommended to grip the steering at 3:45 or 2:50 position. Refer to the image.",
        illustration: "steering-grip",
      },
      {
        id: "documents",
        text: "Does the driver have valid 4 wheeler documents? (DL, Insurance & Emission)",
        guideline: "Yes or No. Please verify and confirm. If Yes, enter the date each document is valid till.",
        followUp: {
          when: "Yes",
          fields: [
            { id: "dlValidTill", label: "Driving licence valid till", kind: "date" },
            { id: "insuranceValidTill", label: "Insurance valid till", kind: "date" },
          ],
        },
      },
    ],
  },
];

/**
 * Final step: the four wheeler on record. (There is no primary/secondary vehicle on this form.)
 * The ids keep their original names so assessments saved offline by an older version still match.
 */
export const VEHICLE_FIELDS: FieldDef[] = [
  { kind: "select", id: "primaryFuel", label: "Fuel Type", required: true, options: ["Petrol", "Diesel", "CNG", "EV"] },
  { kind: "text", id: "primaryNumber", label: "Vehicle Number", required: true, maxLength: 20, placeholder: "e.g. KA01AB1234" },
  { kind: "text", id: "primaryMake", label: "Manufacturer", required: true, maxLength: 60, placeholder: "e.g. Maruti Suzuki" },
  { kind: "text", id: "primaryModel", label: "Model", required: true, maxLength: 60, placeholder: "e.g. Swift" },
];
