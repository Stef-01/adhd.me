export type CareArchetype = {
  id: string;
  title: string;
  eyebrow: string;
  example: string;
  request: string;
  headline: string;
  expectedFirstMatch: string;
  requirements: {
    careAreas: string[];
    preferredGender?: "woman";
    languageOptions?: string[];
    wheelchairAccessible?: boolean;
  };
};

export const careArchetypes: CareArchetype[] = [
  {
    id: "south-indian-pcos",
    title: "PMOS + South Indian context",
    eyebrow: "Culture and emotional safety",
    example: "A woman GP with PMOS experience who speaks Tamil or Malayalam and understands family pressure.",
    request:
      "I’m a young South Indian woman navigating PMOS and a difficult time with my mental health. I want a woman GP who speaks Tamil or Malayalam, understands family pressure and gives me time without judgement.",
    headline: "PMOS, language and emotional safety.",
    expectedFirstMatch: "priya-nair",
    requirements: {
      careAreas: ["pcos", "perinatal-mental-health"],
      preferredGender: "woman",
      languageOptions: ["Tamil", "Malayalam"],
    },
  },
  {
    id: "hindi-punjabi-pcos",
    title: "PMOS + Hindi family context",
    eyebrow: "Family dynamics and mood",
    example: "A calm woman GP who speaks Hindi or Punjabi and understands the emotional side of PMOS.",
    request:
      "I want a calm woman GP for PMOS who speaks Hindi or Punjabi. I’m anxious about symptoms and family expectations, and I need someone collaborative who will explain choices slowly.",
    headline: "PMOS care that includes family and mood.",
    expectedFirstMatch: "nisha-kapoor",
    requirements: {
      careAreas: ["pcos", "perinatal-mental-health"],
      preferredGender: "woman",
      languageOptions: ["Hindi", "Punjabi"],
    },
  },
  {
    id: "pcos-metabolic-reset",
    title: "PMOS + sustainable health goals",
    eyebrow: "Metabolic care without shame",
    example: "A GP who understands PMOS and can help me build sustainable health habits without reducing me to my weight.",
    request:
      "I want to feel stronger and healthier while managing PMOS. I need a woman GP with metabolic-health experience who will talk about sleep, food, movement and mental wellbeing without shame or extreme targets.",
    headline: "PMOS and sustainable health, without shame.",
    expectedFirstMatch: "sofia-alvarez",
    requirements: {
      careAreas: ["pcos", "metabolic"],
      preferredGender: "woman",
    },
  },
  {
    id: "pcos-adhd",
    title: "PMOS care that works with ADHD",
    eyebrow: "Hormonal health and executive function",
    example: "A GP experienced in both PMOS and ADHD who gives me clear, realistic steps instead of an overwhelming plan.",
    request:
      "I have PMOS and ADHD and feel overwhelmed by complicated health plans. I want a GP experienced in both who understands executive-function barriers, gives me a few clear steps at a time and checks what is genuinely realistic for me.",
    headline: "PMOS care that works with your brain.",
    expectedFirstMatch: "grace-chen",
    requirements: {
      careAreas: ["pcos", "adhd"],
    },
  },
  {
    id: "spanish-gestational-diabetes",
    title: "Gestational diabetes + Spanish",
    eyebrow: "Language and practical nutrition",
    example: "A Spanish-speaking woman GP for gestational diabetes who won’t make every conversation about weight.",
    request:
      "I have gestational diabetes and would feel safer with a Spanish-speaking woman GP. I want practical support around food, work and blood sugar without weight stigma or shame.",
    headline: "Gestational diabetes without weight stigma.",
    expectedFirstMatch: "sofia-alvarez",
    requirements: {
      careAreas: ["gestational-diabetes"],
      preferredGender: "woman",
      languageOptions: ["Spanish"],
    },
  },
  {
    id: "arabic-gestational-diabetes",
    title: "Gestational diabetes + Arabic",
    eyebrow: "Complex care in your language",
    example: "An Arabic-speaking woman GP who can coordinate gestational diabetes care and make space for anxiety.",
    request:
      "I’m managing gestational diabetes alongside other health needs. I want an Arabic-speaking woman GP who can coordinate with my hospital team, include my preferences and understand how anxious this feels.",
    headline: "Gestational diabetes with joined-up support.",
    expectedFirstMatch: "leila-haddad",
    requirements: {
      careAreas: ["gestational-diabetes"],
      preferredGender: "woman",
      languageOptions: ["Arabic"],
    },
  },
  {
    id: "post-birth-trauma",
    title: "Post-birth emotional recovery",
    eyebrow: "Trauma-aware conversations",
    example: "A gentle GP who understands birth trauma, anxiety and the pressure to seem fine after having a baby.",
    request:
      "Since giving birth I’ve felt anxious and disconnected from myself. I need a gentle GP who understands birth trauma and perinatal mental health, offers longer appointments and won’t rush me.",
    headline: "Post-birth emotional recovery, gently.",
    expectedFirstMatch: "erin-walsh",
    requirements: {
      careAreas: ["post-birth", "perinatal-mental-health"],
    },
  },
  {
    id: "post-birth-strength",
    title: "Post-birth strength and energy",
    eyebrow: "Health beyond the scales",
    example: "A GP who can help me rebuild strength and energy after birth without body shame or crash-diet advice.",
    request:
      "I want to feel healthier and rebuild strength and energy after giving birth. I need a GP who understands cardiometabolic health, body image and the emotional pressure to ‘bounce back’ without making weight the only goal.",
    headline: "Post-birth strength, without body shame.",
    expectedFirstMatch: "daniel-okafor",
    requirements: {
      careAreas: ["post-birth", "metabolic"],
    },
  },
  {
    id: "neurodivergent-post-birth",
    title: "Neurodivergent post-birth care",
    eyebrow: "Structure without pressure",
    example: "A GP who understands ADHD, post-birth overwhelm and gives me a clear plan I can actually follow.",
    request:
      "I’m neurodivergent and overwhelmed since having my baby. I want a GP with ADHD and women’s-health experience who uses clear steps, checks what is realistic and doesn’t interpret executive-function difficulty as not caring.",
    headline: "Post-birth care that works with your brain.",
    expectedFirstMatch: "tom-bennett",
    requirements: {
      careAreas: ["post-birth", "adhd"],
    },
  },
  {
    id: "vietnamese-disability-rights",
    title: "Disability-rights women’s care",
    eyebrow: "Access, autonomy and language",
    example: "A Vietnamese-speaking GP who understands disability rights and centres my choices in women’s healthcare.",
    request:
      "I’m a disabled Vietnamese-speaking woman looking for reproductive and metabolic care. I need a wheelchair-accessible practice and a GP who understands disability rights, speaks Vietnamese and centres my consent and autonomy.",
    headline: "Accessible women’s care, on your terms.",
    expectedFirstMatch: "linh-nguyen",
    requirements: {
      careAreas: ["disability-rights"],
      preferredGender: "woman",
      languageOptions: ["Vietnamese"],
      wheelchairAccessible: true,
    },
  },
  {
    id: "post-birth-kidney-care",
    title: "Post-birth kidney-aware care",
    eyebrow: "Recovery with complex health needs",
    example: "A Vietnamese-speaking GP who can support post-birth recovery while keeping kidney health in view.",
    request:
      "I want support rebuilding my health after birth while managing kidney concerns. I would prefer a Vietnamese-speaking woman GP who can coordinate care, review medicines and explain decisions without rushing me.",
    headline: "Post-birth recovery with kidney-aware care.",
    expectedFirstMatch: "hanh-tran",
    requirements: {
      careAreas: ["post-birth", "kidney"],
      preferredGender: "woman",
      languageOptions: ["Vietnamese"],
    },
  },
  {
    id: "trauma-sensitive-womens-care",
    title: "Trauma-sensitive women’s care",
    eyebrow: "Consent, control and emotional safety",
    example: "A trauma-informed GP who asks permission, explains each step and lets me stay in control.",
    request:
      "I have a trauma history and need a GP who is sensitive to how healthcare can feel. I want someone trauma-informed who asks permission, explains each step, respects boundaries and lets me stay in control without having to disclose everything at once.",
    headline: "Trauma-sensitive care, with you in control.",
    expectedFirstMatch: "erin-walsh",
    requirements: {
      careAreas: ["trauma-informed"],
    },
  },
  {
    id: "ptsd-bipolar-shared-care",
    title: "PTSD or bipolar shared care",
    eyebrow: "Complex mental health and reproductive care",
    example: "A GP comfortable with PTSD or bipolar disorder who will coordinate with my psychiatrist and maternity team.",
    request:
      "I live with PTSD and bipolar disorder and I’m planning a pregnancy. I need a GP who is comfortable with complex mental health, will coordinate with my psychiatrist and maternity team, and can review physical health and medicines as part of shared care without changing treatment on their own.",
    headline: "Joined-up reproductive and mental-health care.",
    expectedFirstMatch: "noah-williams",
    requirements: {
      careAreas: ["complex-mental-health", "perinatal-mental-health"],
    },
  },
  {
    id: "maternal-depression",
    title: "Maternal depression after birth",
    eyebrow: "Postnatal mood and recovery",
    example: "A woman GP experienced in maternal depression who will listen carefully and coordinate ongoing support.",
    request:
      "Since having my baby I’ve felt persistently low, guilty and unlike myself. I want a woman GP with experience in maternal or postnatal depression who offers longer conversations, checks my safety without judgement and can coordinate with perinatal mental-health support.",
    headline: "Maternal mental health, without judgement.",
    expectedFirstMatch: "erin-walsh",
    requirements: {
      careAreas: ["maternal-depression", "post-birth"],
      preferredGender: "woman",
    },
  },
  {
    id: "post-gdm-metabolic-care",
    title: "Health after gestational diabetes",
    eyebrow: "Post-birth metabolic follow-up",
    example: "A GP who understands follow-up after gestational diabetes and can build a realistic post-birth health plan.",
    request:
      "I had gestational diabetes and want thoughtful follow-up after birth. I need a GP who understands post-birth metabolic health, can coordinate blood-sugar checks and help me build realistic habits around sleep, food and movement without weight shame.",
    headline: "Post-birth metabolic care after gestational diabetes.",
    expectedFirstMatch: "camila-torres",
    requirements: {
      careAreas: ["gestational-diabetes", "post-birth", "metabolic"],
    },
  },
];
