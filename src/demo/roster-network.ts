// The network's clinicians, brought over from revamped-adhd.me (scripts/build-profiles.py, read
// 2026-09-29): every field is that site's, which is each clinician's own description of their work.
// Care areas and manner are what the interview reader (src/onboarding/transcript.ts) heard in their
// description and About, never a qualification line, each manner trait with the sentence it was
// heard in; where it heard none, manner waits for their interview. Nothing here is characterised by
// us. The eleven listed before that day stay in roster.ts with their fuller declarations.

import type { Clinician } from "./roster";

// Gender and pronouns are declared only where the clinician's own public words say them (O257,
// 2026-09-29: seven profiles whose bios say "he" or "she" of themselves; the thirteen written in the
// first person stay undeclared until they say). A woman is one of the finder's high-yield asks
// (docs/matching/HIGH-YIELD.md), and it is only fair to ask when the roster can answer.
export const NETWORK_CLINICIANS: Clinician[] = [
  {
    id: "yogesh-kalra",
    name: "Dr Yogesh Kalra",
    shortName: "Dr Yogesh Kalra",
    gender: "man",
    pronouns: "he/him",
    title: "General practitioner, FRACGP",
    suburb: "Bateau Bay",
    practice: "Dr Yogesh Kalra’s Surgery",
    reach: "Practice appointments in Bateau Bay",
    image: "/clinicians/yogesh-kalra.jpg",
    acceptingNewPatients: true,
    focus: "A GP who continues ADHD medication for people already diagnosed. He is not offering ADHD assessment or diagnosis yet.",
    matchLine: "A GP who continues ADHD medication for people already diagnosed. He is not offering ADHD assessment or diagnosis yet.",
    fitSignals: ["Continues ADHD medication", "Hindi"],
    practicalSignals: ["Bulk billed"],
    summary: "Yogesh is a GP and a Fellow of the Royal Australian College of General Practitioners, practising at his own surgery in Bateau Bay on the Central Coast. For ADHD, he is a continuation prescriber: he keeps your ADHD medication going once you have been diagnosed and have a treatment plan, so you can manage it close to home.",
    about: "Yogesh is a GP and a Fellow of the Royal Australian College of General Practitioners, practising at his own surgery in Bateau Bay on the Central Coast. For ADHD, he is a continuation prescriber: he keeps your ADHD medication going once you have been diagnosed and have a treatment plan, so you can manage it close to home. He is not offering ADHD assessment or diagnosis yet; that is planned for the future. His other interests are family medicine, women’s health, and skin cancer checks and surgery, with diplomas in skin cancer surgery and dermoscopy. He speaks English and Hindi, and the practice bulk bills all eligible Medicare services.",
    experience: ["General practice, Dr Yogesh Kalra’s Surgery, Bateau Bay", "Fellow of the Royal Australian College of General Practitioners", "Diploma in Skin Cancer Surgery", "Professional Diploma of Dermoscopy"],
    languages: ["English", "Hindi"],
    careAreas: ["shared-care"],
    careAreasSometimes: ["womens-health"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "womens-health": "His other interests are family medicine, women\u2019s health, and skin cancer checks and surgery" },
    // sense_making, in their words: "Yogesh is a GP and a Fellow of the Royal Australian College of General Practitioners, practising at his own surgery in B"
    manner: ["sense_making"],
    wheelchairAccessible: false,
    appointmentLength: "Appointment lengths set with the practice",
    booking: { via: "healthengine", practitionerId: "57872", url: "https://healthengine.com.au/doctor/nsw/bateau-bay/dr-yogesh-kalra/p57872" },
    realPerson: true,
  },
  {
    id: "trisha-harris",
    livedExperience: true,
    name: "Trisha Harris",
    shortName: "Trisha",
    profession: "counsellor",
    gender: "woman",
    pronouns: "she/her",
    title: "Clinical counsellor, PACFA Registered Clinical (27633), PGDipCouns",
    suburb: "Glenbrook",
    practice: "Riverview Counselling",
    reach: "Face-to-face sessions in Glenbrook in the Blue Mountains, and by phone and video",
    image: "/clinicians/trisha-harris.jpg",
    acceptingNewPatients: true,
    focus: "A counsellor with ADHD herself, seeing teens, adults, couples and NDIS participants in Glenbrook.",
    matchLine: "A counsellor with ADHD herself, seeing teens, adults, couples and NDIS participants in Glenbrook.",
    fitSignals: ["Teens, adults & couples", "NDIS participants", "Lived experience of ADHD"],
    practicalSignals: ["$180 individual, 60 minutes", "$220 couples & family", "Telehealth"],
    summary: "Hi, I’m Trisha, a Clinical Counsellor, mum of 4 (3 who have diagnosis'), I have ADHD and run a business, so I absolutely understand how busy, stressful and chaotic life can get!",
    about: "Hi, I’m Trisha, a Clinical Counsellor, mum of 4 (3 who have diagnosis'), I have ADHD and run a business, so I absolutely understand how busy, stressful and chaotic life can get! I work with individuals, couples and teens, including NDIS participants. I understand the need for support, to be heard, to have undivided attention that is just for YOU. I can help you handle the 'right now' with a safe space for you to plan for your future and reach your goals. Supporting you, every step of the way.",
    experience: ["Clinical counsellor, Riverview Counselling, Glenbrook", "PACFA Registered Clinical counsellor, registration 27633", "Over two decades working in mental health and counselling", "Individuals, couples, families and teenagers, including NDIS participants", "Attachment-based, CBT, compassion-focused, family systems, Internal Family Systems, person-centred, psychodynamic and solution-focused brief therapy", "Registered career counsellor", "Post Graduate Diploma of Counselling, 2014", "Post Graduate Certificate in Education (Career Development), Australian Catholic University, 2011", "Bachelor of Social Science (Criminology), Western Sydney University, 2003"],
    languages: ["English"],
    careAreas: ["relationships"],
    careAreasSometimes: ["child-adolescent-adhd", "work-career", "parenting"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "relationships": "I work with individuals, couples and teens, including NDIS participants", "work-career": "Registered career counsellor", "parenting": "Individuals, couples, families and teenagers, including NDIS participants" },
    ndis: true, // in their words: "including NDIS participants"
    // attuned, in their words: "I understand the need for support, to be heard, to have undivided attention that is just for YOU. I can help you handle "
    // motivating, in their words: "I understand the need for support, to be heard, to have undivided attention that is just for YOU. I can help you handle "
    manner: ["attuned", "motivating"],
    wheelchairAccessible: false,
    appointmentLength: "60 and 90-minute sessions, weekdays 10am to 4pm; the practice has a waiting list for late afternoons",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.halaxy.com/book/riverview-counselling/location/671701", note: "Riverview Counselling books through Halaxy." },
    realPerson: true,
  },
  {
    id: "lara-schulz",
    name: "Lara Schulz",
    shortName: "Lara Schulz",
    profession: "neurotherapy-practitioner",
    gender: "woman",
    pronouns: "she/her",
    title: "Neurotherapy practitioner, GradDipPsych MBusMgt",
    suburb: "Jindabyne",
    practice: "Neurotherapy Clinics Australia",
    reach: "Clinic appointments in Jindabyne, serving the Snowy Mountains, Cooma and the Snowy Monaro region",
    image: "/clinicians/lara-schulz.jpg",
    acceptingNewPatients: true,
    focus: "QEEG brain mapping and neurotherapy in Jindabyne, with a consultation on the findings before training starts.",
    matchLine: "QEEG brain mapping and neurotherapy in Jindabyne, with a consultation on the findings before training starts.",
    fitSignals: ["QEEG brain mapping", "ERP assessment", "Neurostimulation"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Lara Schulz established her first Neurotherapy practice in Perth in 2019 after completing her neurotherapy training in Santa Barbara, California with expert neuroscientist and founder of Neurofield Neurotherapy, Dr Nicholas Dogris and Dr Tiffany Thompson. Since relocating to Jindabyne in Alpine NSW, she has established Alpine Neurotherapy.",
    about: "Lara Schulz established her first Neurotherapy practice in Perth in 2019 after completing her neurotherapy training in Santa Barbara, California with expert neuroscientist and founder of Neurofield Neurotherapy, Dr Nicholas Dogris and Dr Tiffany Thompson. Since relocating to Jindabyne in Alpine NSW, she has established Alpine Neurotherapy. Lara has a Graduate Diploma in Psychology from the University of NSW and will be continuing with her Post Graduate Psychology study after a well deserved break from study between degrees. She has studied in the USA learning how to read EEG and QEEG assessment as well as ERP assessment and analysis; and a diverse range of neurostimulation techniques including tACS, tDCS, tAPNS and pEMF. In September 2022 Lara was invited to present the results of her neurotherapy practice at the Neurofield International Conference in Santa Barbara USA. Lara has appeared on Sky News being interviewed by Erin Molan along with Dr Dogris in the hope of bringing awareness to Australia about this state of the art therapy for all Australians. As well as speaking at conferences both internationally and domestically Lara regularly is invited to speak to groups for Mental Health information awareness for clinicians in regional areas discussing case studies and Neurostimulation. Lara came to this work as a client, for her own learning difficulties, and changed careers after her own child needed neurofeedback. Having completed a Masters of Business Management at Charles Sturt University, she enrolled in the Graduate Diploma in Psychology through the University of New South Wales to extend her knowledge of psychological functioning, which she describes as integral to her neurotherapy practice. She says she has always felt passionately about wanting to help and reassure anyone with learning difficulties, ADHD or any other disability that they are no different from anyone else: “We just think differently and that is something to nurture and be proud of”.",
    experience: ["Director and principal neurotherapy practitioner, Neurotherapy Clinics Australia", "Alpine Neurotherapy Clinic, Jindabyne, established after relocating from Perth", "Neurotherapy training in Santa Barbara, California, with Dr Nicholas Dogris, founder of Neurofield Neurotherapy, and Dr Tiffany Thompson", "EEG and QEEG assessment, and ERP assessment and analysis", "Neurostimulation including tACS, tDCS, tAPNS and pEMF", "Graduate Diploma in Psychology, University of New South Wales", "Master of Business Management, Charles Sturt University", "Presented her practice results at the Neurofield International Conference, Santa Barbara, September 2022", "Speaks at conferences internationally and domestically, and to clinician groups on mental health awareness in regional areas"],
    languages: ["English"],
    careAreas: [],
    careAreasSometimes: ["study-school"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "study-school": "wanting to help and reassure anyone with learning difficulties, ADHD or any other disability" },
    manner: [],
    mannerPending: "2026-09-29: listed from their public profile; manner is theirs to declare at their interview.",
    wheelchairAccessible: false,
    appointmentLength: "A two-hour first appointment, then a 30-minute consultation on the findings; training sessions run 30 minutes",
    booking: { via: "practice", url: "https://www.ncau.com.au/contact-us/", note: "Neurotherapy Clinics Australia takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "fiona-alexander",
    name: "Fiona Alexander",
    shortName: "Fiona Alexander",
    profession: "adhd-coach",
    gender: "undeclared",
    pronouns: "",
    title: "ADHD coach, BA(Primary Ed) BEd AACC ACC",
    suburb: "Perth",
    practice: "REACH ADHD Coaching and Consultancy",
    reach: "Coaching online, and in person in Perth",
    image: "/clinicians/fiona-alexander.jpg",
    acceptingNewPatients: true,
    focus: "An ADHD coach with 25 years of teaching, helping students and families understand how their brain works.",
    matchLine: "An ADHD coach with 25 years of teaching, helping students and families understand how their brain works.",
    fitSignals: ["Executive functioning", "Students & families", "Able & gifted learners"],
    practicalSignals: ["Fee quoted when you book", "Telehealth"],
    summary: "Throughout my 25 years in education, I’ve had the privilege of teaching children from all walks of life, each with their own strengths and unique ways of thinking. It didn’t take long for me to recognise that every student learns differently and that diversity in learning is something to be celebrated.",
    about: "Throughout my 25 years in education, I’ve had the privilege of teaching children from all walks of life, each with their own strengths and unique ways of thinking. It didn’t take long for me to recognise that every student learns differently and that diversity in learning is something to be celebrated. This realisation inspired me to specialise in ADHD education, where I could focus on supporting neurodivergent students and their families. My teaching journey has taken me across both local and international schools, and in every classroom, I’ve learned just as much as my students. Understanding how your brain works is the first step in overcoming challenges, and it’s incredibly rewarding to help students and families discover that. My coaching approach is about guiding individuals through this journey of self-discovery, helping them embrace who they are, and confidently navigating the learning process. I’m passionate about helping clients thrive in their own way. Together, we can make learning an empowering experience that brings out the best in you.",
    experience: ["Co-founder, REACH ADHD Coaching and Consultancy, Perth", "25 years teaching in local and international schools", "ADHD coach training at the ADHD Coaching Academy (ADDCA), New York", "Associate Certified Coach (ACC), International Coaching Federation", "Bachelor of Arts (Primary School Education)", "Bachelor of Education", "Teaching and Learning for Able/Gifted Children"],
    languages: ["English"],
    careAreas: ["non-medication", "child-adolescent-adhd", "executive-function", "study-school"],
    careAreasSometimes: ["parenting"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "executive-function": "Executive functioning", "study-school": "supporting neurodivergent students and their families", "parenting": "helping students and families discover that" },
    // sense_making, in their words: "An ADHD coach with 25 years of teaching, helping students and families understand how their brain works."
    // motivating, in their words: "Throughout my 25 years in education, I’ve had the privilege of teaching children from all walks of life, each with their"
    // non_judgmental, in their words: "I’m passionate about helping clients thrive in their own way. Together, we can make learning an empowering experience th"
    manner: ["sense_making", "motivating", "non_judgmental"],
    wheelchairAccessible: false,
    appointmentLength: "An initial consultation, then sessions weekly or fortnightly",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.reachadhd.com.au/contact/", note: "REACH ADHD Coaching and Consultancy takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "debbie-hirte",
    name: "Debbie Hirte",
    shortName: "Debbie Hirte",
    profession: "adhd-coach",
    gender: "undeclared",
    pronouns: "",
    title: "ADHD coach, BA(Early Childhood Ed) AACC ACC",
    suburb: "Perth",
    practice: "REACH ADHD Coaching and Consultancy",
    reach: "Coaching online, and in person in Perth",
    image: "/clinicians/debbie-hirte.jpg",
    acceptingNewPatients: true,
    focus: "ADHD coach and former Gifted and Talented Specialist with nearly 30 years in independent schools.",
    matchLine: "ADHD coach and former Gifted and Talented Specialist with nearly 30 years in independent schools.",
    fitSignals: ["Executive functioning", "Children & teens", "Gifted & talented"],
    practicalSignals: ["Fee quoted when you book", "Telehealth"],
    summary: "With nearly three decades in Independent schools, my commitment to supporting neurodivergent students and their families has been a driving force throughout my career. I’ve had the opportunity to work as a classroom teacher, specialist, and later, as a Gifted and Talented Specialist, advocating for students and helping them succeed both academically and socially.",
    about: "With nearly three decades in Independent schools, my commitment to supporting neurodivergent students and their families has been a driving force throughout my career. I’ve had the opportunity to work as a classroom teacher, specialist, and later, as a Gifted and Talented Specialist, advocating for students and helping them succeed both academically and socially. Over the years, I’ve developed a deep understanding of the unique challenges neurodivergent individuals face. My role has allowed me to mentor educators, collaborate with families, and support students through tailored strategies designed to meet their needs. Working closely with this incredible community has only strengthened my passion for helping individuals embrace their unique brain wiring. Through ADHD coaching, my goal is to help students and families see that differences in learning are something to be embraced, not feared. I’m here to provide the tools and strategies that enable growth and success, helping every individual step into their best self with confidence.",
    experience: ["Co-founder, REACH ADHD Coaching and Consultancy, Perth", "Nearly 30 years in independent schools as classroom teacher, specialist and Gifted and Talented Specialist", "Mentoring educators, and co-designing Individual Education Plans with families and schools", "ADHD coach training at the ADHD Coaching Academy (ADDCA), New York", "Associate Certified Coach (ACC), International Coaching Federation", "Bachelor of Arts (Early Childhood Education)"],
    languages: ["English"],
    careAreas: ["non-medication", "child-adolescent-adhd", "executive-function", "study-school"],
    careAreasSometimes: ["parenting"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "executive-function": "Executive functioning", "study-school": "co-designing Individual Education Plans with families and schools", "parenting": "collaborate with families, and support students through tailored strategies" },
    manner: [],
    mannerPending: "2026-09-29: listed from their public profile; manner is theirs to declare at their interview.",
    wheelchairAccessible: false,
    appointmentLength: "An initial consultation, then sessions weekly or fortnightly",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.reachadhd.com.au/contact/", note: "REACH ADHD Coaching and Consultancy takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "romney-taylor",
    name: "Romney Taylor",
    shortName: "Romney Taylor",
    profession: "adhd-coach",
    gender: "undeclared",
    pronouns: "",
    title: "ADHD coach, BSc GradDipEd AACC ACC",
    suburb: "Perth",
    practice: "REACH ADHD Coaching and Consultancy",
    reach: "Coaching online, and in person in Perth",
    image: "/clinicians/romney-taylor.jpg",
    acceptingNewPatients: true,
    focus: "ADHD coach with 23 years of work with students, building strategies for school, home and relationships.",
    matchLine: "ADHD coach with 23 years of work with students, building strategies for school, home and relationships.",
    fitSignals: ["Executive functioning", "Students", "Advocacy & inclusion"],
    practicalSignals: ["Fee quoted when you book", "Telehealth"],
    summary: "For the past 23 years, I’ve worked with students across diverse local and interstate schools, and one of the most important things I’ve learned is that no two minds work the same. Recognising this truth inspired me to pursue specialist training as an ADHD coach, allowing me to focus on supporting neurodivergent individuals in a way that celebrates their strengths and addresses their unique challenges.",
    about: "For the past 23 years, I’ve worked with students across diverse local and interstate schools, and one of the most important things I’ve learned is that no two minds work the same. Recognising this truth inspired me to pursue specialist training as an ADHD coach, allowing me to focus on supporting neurodivergent individuals in a way that celebrates their strengths and addresses their unique challenges. As a consultant coach to REACH ADHD it provides me the opportunity to create a safe and inclusive space where neurodiverse students can feel heard and understood. It’s incredibly rewarding to help them develop strategies that fit their individual needs, whether that’s in the classroom, in relationships, or at home. My passion for advocacy drives me to promote awareness and acceptance for all neurodiverse individuals, building a culture of inclusivity in every environment I work in. Watching my clients grow and achieve goals they once thought were out of reach is the most fulfilling part of my work. Together, we’ll work towards success in a way that is meaningful to you.",
    experience: ["Consultant coach, REACH ADHD Coaching and Consultancy, Perth", "23 years working with students across local and interstate schools", "ADHD coach training at the ADHD Coaching Academy (ADDCA), New York", "Associate Certified Coach (ACC), International Coaching Federation", "Bachelor of Science", "Graduate Diploma in Education", "Mini-COGE, gifted and talented education"],
    languages: ["English"],
    careAreas: ["non-medication", "executive-function", "study-school"],
    careAreasSometimes: ["relationships"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "executive-function": "Executive functioning", "study-school": "23 years working with students across local and interstate schools", "relationships": "whether that\u2019s in the classroom, in relationships, or at home" },
    // motivating, in their words: "ADHD coach with 23 years of work with students, building strategies for school, home and relationships."
    // attuned, in their words: "As a consultant coach to REACH ADHD it provides me the opportunity to create a safe and inclusive space where neurodiver"
    manner: ["motivating", "attuned"],
    wheelchairAccessible: false,
    appointmentLength: "An initial consultation, then sessions weekly or fortnightly",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.reachadhd.com.au/contact/", note: "REACH ADHD Coaching and Consultancy takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "erin-lysle",
    name: "Erin Lysle",
    shortName: "Erin Lysle",
    profession: "adhd-coach",
    gender: "undeclared",
    pronouns: "",
    title: "ADHD coach, BA BEd AACC",
    suburb: "Perth",
    practice: "REACH ADHD Coaching and Consultancy",
    reach: "Coaching online, and in person in Perth",
    image: "/clinicians/erin-lysle.jpg",
    acceptingNewPatients: true,
    focus: "ADHD coach with over 34 years of teaching, working on executive functioning, confidence and social skills.",
    matchLine: "ADHD coach with over 34 years of teaching, working on executive functioning, confidence and social skills.",
    fitSignals: ["Executive functioning", "Self-confidence", "Social skills"],
    practicalSignals: ["Fee quoted when you book", "Telehealth"],
    summary: "With over 34 years of teaching experience, I’ve had the privilege of working across a wide range of educational settings. Over time, I’ve come to understand just how varied and complex ADHD can be for each individual, and this insight has shaped my approach as an ADHD coach.",
    about: "With over 34 years of teaching experience, I’ve had the privilege of working across a wide range of educational settings. Over time, I’ve come to understand just how varied and complex ADHD can be for each individual, and this insight has shaped my approach as an ADHD coach. I bring together my expertise in education with a deep understanding of ADHD, crafting strategies that truly connect with each client. As a consulting coach to REACH ADHD, my priority is meeting each person where they are. I believe in creating a supportive, positive environment where clients feel encouraged to explore new strategies and tackle challenges head-on. Whether we’re focusing on building self-confidence, improving executive functioning, or enhancing social skills, my coaching is centred around empathy, patience, and understanding. My role is to help clients not only manage ADHD traits but to help them grow in a way that aligns with their personal goals and values. I celebrate every milestone with my clients, big or small, and I’m dedicated to equipping them with tools that lead to long-lasting success.",
    experience: ["Consultant coach, REACH ADHD Coaching and Consultancy, Perth", "Over 34 years teaching across a wide range of educational settings", "ADHD coach training at the ADHD Coaching Academy (ADDCA), New York", "Bachelor of Arts", "Bachelor of Education"],
    languages: ["English"],
    careAreas: ["non-medication", "executive-function", "social-connection"],
    careAreasSometimes: ["study-school"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "executive-function": "improving executive functioning", "social-connection": "enhancing social skills", "study-school": "working across a wide range of educational settings" },
    // attuned, in their words: "As a consulting coach to REACH ADHD, my priority is meeting each person where they are. I believe in creating a supporti"
    // motivating, in their words: "As a consulting coach to REACH ADHD, my priority is meeting each person where they are. I believe in creating a supporti"
    // non_judgmental, in their words: "As a consulting coach to REACH ADHD, my priority is meeting each person where they are. I believe in creating a supporti"
    manner: ["attuned", "motivating", "non_judgmental"],
    wheelchairAccessible: false,
    appointmentLength: "An initial consultation, then sessions weekly or fortnightly",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.reachadhd.com.au/contact/", note: "REACH ADHD Coaching and Consultancy takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "donna-italiano",
    name: "Donna Italiano",
    shortName: "Donna Italiano",
    profession: "adhd-coach",
    expertise: ["emotional-regulation"],
    gender: "woman",
    pronouns: "she/her",
    title: "ADHD coach, BA BEd AACC",
    suburb: "Perth",
    practice: "REACH ADHD Coaching and Consultancy",
    reach: "Coaching online, and in person in Perth",
    image: "/clinicians/donna-italiano.jpg",
    acceptingNewPatients: true,
    focus: "ADHD coach and secondary teacher working with young people on executive functioning and emotional regulation.",
    matchLine: "ADHD coach and secondary teacher working with young people on executive functioning and emotional regulation.",
    fitSignals: ["Executive functioning", "Emotional regulation", "Neurodivergent-affirming"],
    practicalSignals: ["Fee quoted when you book", "Telehealth"],
    summary: "With over two decades of experience across Australian and international school communities, Donna Italiano is an ADHD coach, consultant, and educator with a deep understanding of how learning, wellbeing, and performance intersect. Her background spans secondary education, ATAR Economics and Business Management, Special Needs Support, Commerce, and Sport, giving her a whole-person perspective on education that integrates neuroscience, emotional safety, and compassion.",
    about: "With over two decades of experience across Australian and international school communities, Donna Italiano is an ADHD coach, consultant, and educator with a deep understanding of how learning, wellbeing, and performance intersect. Her background spans secondary education, ATAR Economics and Business Management, Special Needs Support, Commerce, and Sport, giving her a whole-person perspective on education that integrates neuroscience, emotional safety, and compassion. Throughout her career, Donna has taught and mentored thousands of students, led middle-management teams, supported both high-performing and neurodivergent learners, and contributed beyond the classroom through roles in professional services, governance, and community sport. These diverse experiences have shaped her belief that connection is foundational to learning, and that understanding how the brain works is key to unlocking confidence, regulation, and growth. As a consultant coach with REACH ADHD, Donna focuses on ADHD, executive functioning, emotional regulation, and neurodivergent-affirming practice. She is passionate about creating safe, inclusive spaces where students and families feel seen, understood, and supported. Donna works alongside young people to help them understand their unique brain wiring, build practical strategies, and move toward their goals with clarity, confidence, and self-belief.",
    experience: ["Consultant coach, REACH ADHD Coaching and Consultancy, Perth", "Secondary education: ATAR Economics and Business Management, Special Needs Support, Commerce and Sport", "Middle-management leadership, and roles in professional services, governance and community sport", "ADHD coach training at the ADHD Coaching Academy (ADDCA), New York", "Bachelor of Arts", "Bachelor of Education"],
    languages: ["English"],
    careAreas: ["emotional-regulation", "non-medication", "executive-function", "study-school"],
    careAreasSometimes: ["work-career", "child-adolescent-adhd"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "child-adolescent-adhd": "Donna works alongside young people to help them understand their unique brain wiring", "executive-function": "Donna focuses on ADHD, executive functioning, emotional regulation, and neurodivergent-affirming practice", "study-school": "creating safe, inclusive spaces where students and families feel seen", "work-career": "how learning, wellbeing, and performance intersect" },
    // attuned, in their words: "With over two decades of experience across Australian and international school communities, Donna Italiano is an ADHD co"
    // sense_making, in their words: "Throughout her career, Donna has taught and mentored thousands of students, led middle-management teams, supported both "
    // motivating, in their words: "As a consultant coach with REACH ADHD, Donna focuses on ADHD, executive functioning, emotional regulation, and neurodive"
    // collaborative, in their words: "As a consultant coach with REACH ADHD, Donna focuses on ADHD, executive functioning, emotional regulation, and neurodive"
    manner: ["attuned", "sense_making", "motivating", "collaborative"],
    wheelchairAccessible: false,
    appointmentLength: "An initial consultation, then sessions weekly or fortnightly",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.reachadhd.com.au/contact/", note: "REACH ADHD Coaching and Consultancy takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "kate-dallimore",
    name: "Kate Dallimore",
    shortName: "Kate Dallimore",
    profession: "adhd-coach",
    gender: "undeclared",
    pronouns: "",
    title: "ADHD coach, BSc(Physio Hons) PGDipPhysio MTeach AACC ACC",
    suburb: "Perth",
    practice: "REACH ADHD Coaching and Consultancy",
    reach: "Coaching online, and in person in Perth",
    image: "/clinicians/kate-dallimore.jpg",
    acceptingNewPatients: true,
    focus: "ADHD coach with a background in physiotherapy and teaching, using a trauma-informed approach.",
    matchLine: "ADHD coach with a background in physiotherapy and teaching, using a trauma-informed approach.",
    fitSignals: ["Trauma-informed", "Executive functioning", "Neurodiversity-affirming"],
    practicalSignals: ["Fee quoted when you book", "Telehealth"],
    summary: "I bring over 30 years of experience across healthcare, secondary and tertiary education, mentoring, leadership and community involvement to my work as an ADHD Consultant Coach. Across my career, I have been drawn to supporting people who have not always felt understood, helping them feel safe enough to recognise their strengths, trust themselves and take the next step.",
    about: "I bring over 30 years of experience across healthcare, secondary and tertiary education, mentoring, leadership and community involvement to my work as an ADHD Consultant Coach. Across my career, I have been drawn to supporting people who have not always felt understood, helping them feel safe enough to recognise their strengths, trust themselves and take the next step. My work with students, families, clients and professionals has always centred on creating calm, supportive spaces where people feel heard, respected and able to build confidence and belief in themselves. As an ADHD Consultant Coach with REACH ADHD, I bring a warm, neurodiversity-affirming and trauma-informed approach to supporting individuals with ADHD and executive functioning challenges. My experience supporting people navigating ongoing stress, anxiety, overwhelm and complex life experiences has shaped the way I coach, with a strong focus on safety, trust, empathy and respect. I believe meaningful growth begins with connection and a genuine sense of belonging. My coaching is collaborative and strengths-based, helping clients better understand their unique brain wiring, recognise what is already working, develop practical strategies and move toward their goals with greater clarity, confidence and self-trust.",
    experience: ["Consultant coach, REACH ADHD Coaching and Consultancy, Perth", "Over 30 years across healthcare, secondary and tertiary education, mentoring and leadership", "Supporting people through ongoing stress, anxiety, overwhelm and complex life experiences", "ADHD coach training at the ADHD Coaching Academy (ADDCA), New York", "Associate Certified Coach (ACC)", "Bachelor of Science (Physiotherapy) with Honours", "Postgraduate Diploma in Respiratory Physiotherapy", "Master of Teaching (Secondary)"],
    languages: ["English"],
    careAreas: ["trauma-informed", "non-medication", "executive-function"],
    careAreasSometimes: ["anxiety", "work-career"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "executive-function": "supporting individuals with ADHD and executive functioning challenges", "work-career": "supporting people navigating ongoing stress, anxiety, overwhelm and complex life experiences" },
    // motivating, in their words: "Neurodiversity-affirming"
    // attuned, in their words: "I bring over 30 years of experience across healthcare, secondary and tertiary education, mentoring, leadership and commu"
    // steadying, in their words: "I bring over 30 years of experience across healthcare, secondary and tertiary education, mentoring, leadership and commu"
    // sense_making, in their words: "I believe meaningful growth begins with connection and a genuine sense of belonging. My coaching is collaborative and st"
    manner: ["motivating", "attuned", "steadying", "sense_making"],
    wheelchairAccessible: false,
    appointmentLength: "An initial consultation, then sessions weekly or fortnightly",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.reachadhd.com.au/contact/", note: "REACH ADHD Coaching and Consultancy takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "jessica-katsamatsas",
    name: "Jessica Katsamatsas",
    shortName: "Jess",
    profession: "psychologist",
    gender: "undeclared",
    pronouns: "",
    title: "Registered psychologist",
    suburb: "Ashgrove",
    practice: "Neutral Minds Psychology",
    reach: "In-person appointments in Ashgrove, Brisbane, and telehealth Australia-wide",
    image: "/clinicians/jessica-katsamatsas.jpg",
    acceptingNewPatients: true,
    focus: "Psychologist working mainly with young neurodivergent adults on anxiety, burnout and self-esteem.",
    matchLine: "Psychologist working mainly with young neurodivergent adults on anxiety, burnout and self-esteem.",
    fitSignals: ["Neurodivergent adults", "Neurodiversity-affirming", "Trauma-informed"],
    practicalSignals: ["$220 per session", "Telehealth Australia-wide"],
    summary: "Hi, I’m Jess, a psychologist who believes therapy should feel like a space where you can take a breath, put the mask down, and be a little more human.",
    about: "Hi, I’m Jess, a psychologist who believes therapy should feel like a space where you can take a breath, put the mask down, and be a little more human. I work primarily with young neurodivergent adults who may be navigating anxiety, burnout, low self-esteem, relationship difficulties, attachment wounds, or the lingering impact of past experiences. Many of the people I work with have spent a long time trying to understand why everyday life can feel harder than it seems to for everyone else. They may be used to overthinking, people-pleasing, masking, holding everything together, or feeling like they’re constantly trying to keep up. As someone passionate about neurodiversity-affirming care, I also understand that healing and growth don’t have to mean becoming “less neurodivergent” or learning to fit yourself into someone else’s idea of what life should look like. Sometimes, therapy is about understanding yourself more deeply, letting go of strategies that no longer serve you, and creating a life that actually works for you. My work draws on evidence-based approaches including CBT, ACT and mindfulness, alongside attachment-focused, trauma-informed and somatic-informed perspectives. I have a particular interest in the ways our early relationships and experiences can shape how we see ourselves, connect with others and cope with the world around us. My approach to therapy is warm, collaborative and down-to-earth. I’m not here to tell you how you should feel or hand you a list of strategies and send you on your way. Instead, we’ll work together to better understand your experiences, patterns, relationships and nervous system, while finding practical ways to make life feel more manageable. You don’t need to have the right words. You don’t need to know exactly what you want to work on. You just need a place to start. We can figure out the rest together.",
    experience: ["Registered psychologist and director, Neutral Minds Psychology, Ashgrove", "Individual supportive psychological counselling for adults 18 and over", "Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT) and mindfulness", "Attachment-focused, trauma-informed and somatic-informed practice", "Anxiety, burnout, low self-esteem, relationship difficulties and attachment wounds", "Neurodiversity-affirming care for young neurodivergent adults", "Psychological integration support for experiences undertaken outside formal therapeutic settings", "NDIS participants who are self-managed and plan-managed"],
    languages: ["English"],
    careAreas: ["anxiety", "trauma-informed", "work-career", "relationships", "late-diagnosis"],
    careAreasSometimes: ["non-medication", "social-connection"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "work-career": "young neurodivergent adults who may be navigating anxiety, burnout, low self-esteem", "relationships": "relationship difficulties, attachment wounds", "late-diagnosis": "spent a long time trying to understand why everyday life can feel harder than it seems to for everyone else", "social-connection": "overthinking, people-pleasing, masking" },
    ndis: true, // in their words: "NDIS participants who are self-managed and plan-managed"
    // motivating, in their words: "Neurodiversity-affirming"
    // attuned, in their words: "Hi, I’m Jess, a psychologist who believes therapy should feel like a space where you can take a breath, put the mask dow"
    // non_judgmental, in their words: "Hi, I’m Jess, a psychologist who believes therapy should feel like a space where you can take a breath, put the mask dow"
    // sense_making, in their words: "I work primarily with young neurodivergent adults who may be navigating anxiety, burnout, low self-esteem, relationship "
    manner: ["motivating", "attuned", "non_judgmental", "sense_making"],
    wheelchairAccessible: false,
    appointmentLength: "50-minute sessions for adults 18 and over; booked online through the practice’s portal",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://clientportal.zandahealth.com/clientportal/neutralmindspsychology/appointment-booking", note: "Neutral Minds Psychology books through its client portal." },
    realPerson: true,
  },
  {
    id: "chantelle-pin",
    livedExperience: true,
    name: "Chantelle Pin",
    shortName: "Chantelle",
    profession: "psychologist",
    expertise: ["late-diagnosis"],
    gender: "undeclared",
    pronouns: "",
    title: "Clinical psychologist, MClinPsych PGPsychSci BPsychSci BCrim&CrimJust MAPS",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa on the Gold Coast, and telehealth Australia-wide",
    image: "/clinicians/chantelle-pin.jpg",
    acceptingNewPatients: true,
    focus: "A clinical psychologist, late-diagnosed with ADHD herself, working with neurodivergent children and adults. Taking on assessments.",
    matchLine: "A clinical psychologist, late-diagnosed with ADHD herself, working with neurodivergent children and adults. Taking on assessments.",
    fitSignals: ["Assessments", "Neurodivergent clients", "Children to adults", "Lived experience of ADHD"],
    practicalSignals: ["Fee quoted when you book", "Telehealth Australia-wide"],
    summary: "I aim to provide a safe, comfortable space for yourself or your child to tackle the obstacles life throws.",
    about: "I aim to provide a safe, comfortable space for yourself or your child to tackle the obstacles life throws. I work across the lifespan with neurodiverse clients. I am a late-diagnosed neurodivergent (ADHD) adult, so I bring lived experience together with my training to support my clients. When I am not at Therapy Co, I spend my time with family, my two dachshunds, friends, jigsaw puzzles, Harry Potter and travelling.",
    experience: ["Clinical psychologist, founder and director, Therapy Co, Benowa", "Board Approved Supervisor", "Clinical Registrar Program, completed 2022", "Master of Clinical Psychology, Griffith University", "Graduate Diploma of Psychological Science, Bond University", "Bachelor of Psychological Science, Griffith University", "Bachelor of Criminology and Criminal Justice, Griffith University"],
    languages: ["English"],
    careAreas: ["adhd-assessment", "child-adolescent-adhd", "late-diagnosis"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "late-diagnosis": "I am a late-diagnosed neurodivergent (ADHD) adult, so I bring lived experience together with my training" },
    manner: [],
    mannerPending: "2026-09-29: listed from their public profile; manner is theirs to declare at their interview.",
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.halaxy.com/book/appointment/therapy-co/location/598571", note: "Therapy Co books through Halaxy." },
    realPerson: true,
  },
  {
    id: "sarah-bibo",
    name: "Sarah Bibo",
    shortName: "Sarah",
    profession: "psychologist",
    gender: "undeclared",
    pronouns: "",
    title: "Psychologist, MClinPsych BPsych(Hons)",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa on the Gold Coast, and telehealth Australia-wide",
    image: "/clinicians/sarah-bibo.jpg",
    acceptingNewPatients: true,
    focus: "On maternity leave for now. Works with anxiety, low mood, trauma, ADHD, autism, eating and body image.",
    matchLine: "On maternity leave for now. Works with anxiety, low mood, trauma, ADHD, autism, eating and body image.",
    fitSignals: ["Neurodivergent clients", "Eating & body image"],
    practicalSignals: ["Fee quoted when you book", "Telehealth Australia-wide"],
    summary: "I am passionate about the transformative potential of psychotherapy in supporting personal growth and healing.",
    about: "I am passionate about the transformative potential of psychotherapy in supporting personal growth and healing. I am dedicated to creating a safe, supportive and non-judgmental environment where clients feel empowered to navigate life’s challenges and work towards their goals. I have worked with depression, anxiety, trauma, neurodiversity (autism and ADHD), interpersonal difficulties, disordered eating and body image concerns. My approach is warm, compassionate, person-centred and strengths-based, drawing on CBT, DBT, ACT, Compassion-Focused Therapy and Positive Psychology. Outside work I enjoy gardening, hiking, swimming, travelling, the gym, and time with family and friends.",
    experience: ["Registered psychologist, Therapy Co, Benowa", "Clinical Registrar Program, in progress", "Master of Clinical Psychology, 2025", "Bachelor of Psychology (Honours), research on neural pathways in children with ADHD", "CBT, DBT, ACT, Compassion-Focused Therapy and Positive Psychology"],
    languages: ["English"],
    careAreas: ["depression", "anxiety", "trauma-informed", "autism-adhd", "eating-body"],
    careAreasSometimes: ["relationships"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "eating-body": "disordered eating and body image concerns", "relationships": "interpersonal difficulties" },
    // non_judgmental, in their words: "I am dedicated to creating a safe, supportive and non-judgmental environment where clients feel empowered to navigate li"
    // motivating, in their words: "I have worked with depression, anxiety, trauma, neurodiversity (autism and ADHD), interpersonal difficulties, disordered"
    manner: ["non_judgmental", "motivating"],
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://thetherapyco.com.au/contact/", note: "Therapy Co takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "gisele-fortkamp",
    name: "Gisele Fortkamp",
    shortName: "Gisele",
    profession: "psychologist",
    expertise: ["emotional-regulation"],
    gender: "undeclared",
    pronouns: "",
    title: "Psychologist, BSc(Hons) MAPS",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa on the Gold Coast, and telehealth Australia-wide",
    image: "/clinicians/gisele-fortkamp.jpg",
    acceptingNewPatients: true,
    focus: "Supports children with ADHD or autism and their parents, and women adjusting to a diagnosis. Sessions in English or Portuguese.",
    matchLine: "Supports children with ADHD or autism and their parents, and women adjusting to a diagnosis. Sessions in English or Portuguese.",
    fitSignals: ["Children & parents", "Women’s wellbeing", "Portuguese"],
    practicalSignals: ["Fee quoted when you book", "Telehealth Australia-wide"],
    summary: "I am a psychologist committed to supporting children’s development and helping women move toward greater confidence, clarity and more fulfilling relationships.",
    about: "I am a psychologist committed to supporting children’s development and helping women move toward greater confidence, clarity and more fulfilling relationships. I trained in Brazil and am fully registered in Australia. I provide a warm, supportive space grounded in evidence-based practice, with clear, practical guidance. I work with parents and children on emotional regulation, behaviour, communication and self-esteem, with a special interest in ADHD and autism, using a strengths-based, neurodivergence-affirming approach. I also support women with self-esteem, identity, life transitions, relationships, anxiety and low mood, including women exploring or adjusting to an ADHD or autism diagnosis. I offer sessions in Portuguese and English.",
    experience: ["Senior psychologist, Therapy Co, Benowa", "Level 1 Couples Counselling, Gottman Institute, 2026", "5+1 Internship Program, completed 2024", "Postgraduate Certificate in Psychodrama Psychology, Florianópolis, Brazil", "Bachelor of Psychology with Honours thesis on learning difficulties in children, Brazil"],
    languages: ["English", "Portuguese"],
    careAreas: ["child-adolescent-adhd", "autism-adhd", "parenting", "relationships", "late-diagnosis"],
    careAreasSometimes: ["emotional-regulation", "depression", "anxiety", "womens-health", "grief-life-change", "cultural-background"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "parenting": "I work with parents and children on emotional regulation, behaviour, communication and self-esteem", "relationships": "Level 1 Couples Counselling, Gottman Institute; more fulfilling relationships", "late-diagnosis": "women exploring or adjusting to an ADHD or autism diagnosis", "womens-health": "helping women move toward greater confidence, clarity and more fulfilling relationships", "grief-life-change": "self-esteem, identity, life transitions", "cultural-background": "I trained in Brazil and am fully registered in Australia; sessions in Portuguese and English" },
    // motivating, in their words: "I work with parents and children on emotional regulation, behaviour, communication and self-esteem, with a special inter"
    manner: ["motivating"],
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.halaxy.com/book/appointment/therapy-co/location/598571", note: "Therapy Co books through Halaxy." },
    realPerson: true,
  },
  {
    id: "lana-hiscock",
    name: "Lana Hiscock",
    shortName: "Lana",
    profession: "psychologist",
    expertise: ["sleep-routine"],
    gender: "undeclared",
    pronouns: "",
    title: "Psychologist, MClinPsych BPsych(Hons)",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa on the Gold Coast, and telehealth Australia-wide",
    image: "/clinicians/lana-hiscock.jpg",
    acceptingNewPatients: true,
    focus: "Neurodiversity, relationships, sleep, perinatal mental health and women’s health. Sessions in English or Mandarin.",
    matchLine: "Neurodiversity, relationships, sleep, perinatal mental health and women’s health. Sessions in English or Mandarin.",
    fitSignals: ["Perinatal & postnatal", "Sleep", "Mandarin & Shanghainese"],
    practicalSignals: ["Fee quoted when you book", "Telehealth Australia-wide"],
    summary: "If you’re navigating neurodiversity, relationships, sleep, perinatal and postnatal mental health or women’s health, I offer a supportive and culturally compassionate space shaped by my own diverse background.",
    about: "If you’re navigating neurodiversity, relationships, sleep, perinatal and postnatal mental health or women’s health, I offer a supportive and culturally compassionate space shaped by my own diverse background. I integrate lived experience with professional training to support clients in a grounded, holistic way, in a safe and collaborative space where people feel genuinely understood. My approach is warm, compassionate and non-judgmental, drawing on person-centred, strengths-based and evidence-based approaches including CBT, DBT, ACT and positive psychology. In my downtime I get outdoors with a coffee and a good book, travel, do pilates or yoga, and make friends with the local king parrots.",
    experience: ["Psychologist, Therapy Co, Benowa", "Master of Clinical Psychology, Bond University, 2026", "Graduate Diploma of Psychology (Honours), 2023", "CBT, DBT, ACT and positive psychology"],
    languages: ["English", "Mandarin", "Shanghainese"],
    careAreas: ["sleep", "relationships", "womens-health", "cultural-background", "perinatal"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "sleep": "navigating neurodiversity, relationships, sleep, perinatal and postnatal mental health or women\u2019s health", "relationships": "navigating neurodiversity, relationships, sleep", "womens-health": "perinatal and postnatal mental health or women\u2019s health", "cultural-background": "a supportive and culturally compassionate space shaped by my own diverse background", "perinatal": "perinatal and postnatal mental health" },
    // attuned, in their words: "I integrate lived experience with professional training to support clients in a grounded, holistic way, in a safe and co"
    // collaborative, in their words: "I integrate lived experience with professional training to support clients in a grounded, holistic way, in a safe and co"
    // motivating, in their words: "My approach is warm, compassionate and non-judgmental, drawing on person-centred, strengths-based and evidence-based app"
    // non_judgmental, in their words: "My approach is warm, compassionate and non-judgmental, drawing on person-centred, strengths-based and evidence-based app"
    manner: ["attuned", "collaborative", "motivating", "non_judgmental"],
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.halaxy.com/book/appointment/therapy-co/location/598571", note: "Therapy Co books through Halaxy." },
    realPerson: true,
  },
  {
    id: "valeria-urrutia",
    name: "Valeria Urrutia",
    shortName: "Valeria",
    profession: "psychologist",
    gender: "undeclared",
    pronouns: "",
    title: "Psychologist, MClinPsyc BPsychSci(Hons) BA",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa on the Gold Coast, and telehealth Australia-wide",
    image: "/clinicians/valeria-urrutia.jpg",
    acceptingNewPatients: true,
    focus: "Anxiety, low mood, grief, life changes, neurodiversity and psychological assessments. Sessions in English or Spanish.",
    matchLine: "Anxiety, low mood, grief, life changes, neurodiversity and psychological assessments. Sessions in English or Spanish.",
    fitSignals: ["Assessments", "Grief & life changes", "Spanish"],
    practicalSignals: ["Fee quoted when you book", "Telehealth Australia-wide"],
    summary: "I enjoy taking a curious, collaborative and flexible approach to therapy, and I believe the therapeutic relationship is an important part of creating meaningful change.",
    about: "I enjoy taking a curious, collaborative and flexible approach to therapy, and I believe the therapeutic relationship is an important part of creating meaningful change. I aim to create a space where people feel respected, understood and comfortable being themselves. I tailor therapy to each person, drawing on CBT, ACT, DBT and Compassion-Focused Therapy. I work across the lifespan with life transitions, anxiety and depression, grief and loss, neurodiversity, alcohol and other drug concerns, and psychological assessments, which I approach in a client-centred, strengths-based way. I am originally from Peru and can also provide therapy in Spanish. Outside work I enjoy beach days, hiking, tennis, new recipes and a good record.",
    experience: ["Registered psychologist, Therapy Co, Benowa", "Master of Psychology (Clinical), Bond University, 2026", "Bachelor of Psychological Science (Honours), Bond University", "Bachelor of Arts in psychology and music psychology, University of Queensland", "Inpatient, outpatient and therapeutic community settings"],
    languages: ["English", "Spanish"],
    careAreas: ["adhd-assessment", "depression", "anxiety", "grief-life-change"],
    careAreasSometimes: ["substance-history", "cultural-background"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "grief-life-change": "life transitions, anxiety and depression, grief and loss", "cultural-background": "I am originally from Peru and can also provide therapy in Spanish" },
    // attuned, in their words: "I aim to create a space where people feel respected, understood and comfortable being themselves. I tailor therapy to ea"
    // motivating, in their words: "I work across the lifespan with life transitions, anxiety and depression, grief and loss, neurodiversity, alcohol and ot"
    manner: ["attuned", "motivating"],
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://www.halaxy.com/book/appointment/therapy-co/location/598571", note: "Therapy Co books through Halaxy." },
    realPerson: true,
  },
  {
    id: "ebony-young",
    name: "Ebony Young",
    shortName: "Ebony",
    profession: "therapy-assistant",
    gender: "undeclared",
    pronouns: "",
    title: "Therapy assistant, BPsych(Hons)",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa, and at home, at school or in the community",
    image: "/clinicians/ebony-young.jpg",
    acceptingNewPatients: true,
    focus: "A therapy assistant with a psychology honours degree, practising skills with you between sessions, supervised by your psychologist.",
    matchLine: "A therapy assistant with a psychology honours degree, practising skills with you between sessions, supervised by your psychologist.",
    fitSignals: ["Skills practice", "Works with your psychologist"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Where people feel safe to learn, experiment and explore, they develop a sense of independence and self-confidence that is so valuable to our wellbeing.",
    about: "Where people feel safe to learn, experiment and explore, they develop a sense of independence and self-confidence that is so valuable to our wellbeing. My psychology honours degree gave me a good understanding of mental health through psychological theory, assessment and research. I hope to complete a Masters and become a clinical psychologist. In my own time I enjoy my miniature dachshund, friends and family, jigsaw puzzles, reading and true crime podcasts.",
    experience: ["Therapy assistant, Therapy Co, Benowa, supervised by the practice’s psychologists", "Bachelor of Psychology (Honours), research on disgust, empathy and moral decision-making"],
    languages: ["English"],
    careAreas: [],
    manner: [],
    mannerPending: "2026-09-29: listed from their public profile; manner is theirs to declare at their interview.",
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    booking: { via: "practice", url: "https://thetherapyco.com.au/contact/", note: "Therapy Co takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "alexandra-wainwright",
    name: "Alexandra Wainwright",
    shortName: "Alexandra",
    profession: "therapy-assistant",
    gender: "undeclared",
    pronouns: "",
    title: "Therapy assistant and support worker, BPsychSc (in progress)",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa, and at home, at school or in the community",
    image: "/clinicians/alexandra-wainwright.jpg",
    acceptingNewPatients: true,
    focus: "Studying psychology at Griffith University. Practises skills with you between sessions, supervised by your psychologist.",
    matchLine: "Studying psychology at Griffith University. Practises skills with you between sessions, supervised by your psychologist.",
    fitSignals: ["Skills practice", "NDIS support work"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "I’m passionate about creating a comfortable, understanding environment where clients feel respected and supported as they work toward their goals.",
    about: "I’m passionate about creating a comfortable, understanding environment where clients feel respected and supported as they work toward their goals. I’m studying a Bachelor of Psychological Science at Griffith University, with a strong interest in developmental psychology, and my studies inform my therapy assistant and support work. In my spare time you will find me with a good book, with friends, or on a sunny beach day with an iced caramel latte.",
    experience: ["Therapy assistant and support worker, Therapy Co, Benowa, supervised by the practice’s psychologists", "Bachelor of Psychological Science, Griffith University, in progress"],
    languages: ["English"],
    careAreas: [],
    ndis: true, // in their words: "NDIS support work"
    manner: [],
    mannerPending: "2026-09-29: listed from their public profile; manner is theirs to declare at their interview.",
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    booking: { via: "practice", url: "https://thetherapyco.com.au/contact/", note: "Therapy Co takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "eliza-keefe",
    name: "Eliza Keefe",
    shortName: "Eliza",
    profession: "therapy-assistant",
    gender: "woman",
    pronouns: "she/her",
    title: "Therapy assistant and support worker, BPsychSc(Hons)",
    suburb: "Benowa",
    practice: "Therapy Co",
    reach: "In person in Benowa, and at home, at school or in the community",
    image: "/clinicians/eliza-keefe.jpg",
    acceptingNewPatients: true,
    focus: "Finishing a Master of Clinical Psychology, with an interest in children and teens. Practises life skills with you, supervised by your psychologist.",
    matchLine: "Finishing a Master of Clinical Psychology, with an interest in children and teens. Practises life skills with you, supervised by your psychologist.",
    fitSignals: ["Children & teens", "NDIS support work"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Eliza enjoys creating a calm, supportive and engaging environment where you can feel comfortable to learn new skills.",
    about: "Eliza enjoys creating a calm, supportive and engaging environment where you can feel comfortable to learn new skills. She is completing her Master of Clinical Psychology at Griffith University, with a particular interest in child and adolescent mental health, psychological assessment, and supporting children and adults with everyday life skills. Outside work and study you’ll usually find her at the beach, with family and friends, or enjoying a good coffee.",
    experience: ["Therapy assistant and support worker, Therapy Co, Benowa, supervised by the practice’s psychologists", "Master of Clinical Psychology, Griffith University, in progress", "Bachelor of Psychological Science (Honours), University of New England"],
    languages: ["English"],
    careAreas: ["child-adolescent-adhd"],
    careAreasSometimes: ["executive-function"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "executive-function": "supporting children and adults with everyday life skills" },
    ndis: true, // in their words: "NDIS support work"
    manner: [],
    mannerPending: "2026-09-29: listed from their public profile; manner is theirs to declare at their interview.",
    wheelchairAccessible: false,
    appointmentLength: "Usually 50-minute sessions; times set with the practice",
    booking: { via: "practice", url: "https://thetherapyco.com.au/contact/", note: "Therapy Co takes bookings on its own website." },
    realPerson: true,
  },
  {
    id: "bart-traynor",
    name: "Bart Traynor",
    shortName: "Bart",
    profession: "psychologist",
    gender: "man",
    pronouns: "he/him",
    title: "Clinical psychologist",
    suburb: "Bundall",
    practice: "Atlantis Recovery Centre",
    reach: "Clinic appointments in Bundall, on the Gold Coast",
    image: "/clinicians/bart-traynor.jpg",
    acceptingNewPatients: true,
    focus: "Clinical psychologist and director who works with career and performance pressure and major life changes.",
    matchLine: "Clinical psychologist and director who works with career and performance pressure and major life changes.",
    fitSignals: ["Performance & career", "Life transitions", "Clinical supervisor"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Bart is a passionate, straight-talking Clinical Psychologist who believes mental health support should help people function better in everyday life, not just feel better in the therapy room. He works with clients facing complex challenges, career and performance pressures, and major life transitions, while also supporting clinicians through supervision and professional development.",
    about: "Bart is a passionate, straight-talking Clinical Psychologist who believes mental health support should help people function better in everyday life, not just feel better in the therapy room. He works with clients facing complex challenges, career and performance pressures, and major life transitions, while also supporting clinicians through supervision and professional development. As Director of Atlantis Recovery Centre, Bart leads an integrated approach that brings together psychology, movement, physical rehabilitation, and performance. His warm, practical style helps people build resilience, improve both mental and physical fitness, and create meaningful, lasting change.",
    experience: ["Clinical psychologist, director and co-owner, Atlantis Recovery Centre, Bundall", "AHPRA board-approved clinical supervisor", "Complex challenges, career and performance pressures, and major life transitions", "Supervision and professional development for clinicians", "Member, Australian Association of Psychologists", "Member, Association of Applied Sports Psychology"],
    languages: ["English"],
    careAreas: ["work-career", "grief-life-change"],
    careAreasSometimes: ["movement-exercise"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "work-career": "clients facing complex challenges, career and performance pressures", "grief-life-change": "major life transitions", "movement-exercise": "brings together psychology, movement, physical rehabilitation, and performance" },
    // attuned, in their words: "Bart is a passionate, straight-talking Clinical Psychologist who believes mental health support should help people funct"
    // non_judgmental, in their words: "Bart is a passionate, straight-talking Clinical Psychologist who believes mental health support should help people funct"
    // motivating, in their words: "As Director of Atlantis Recovery Centre, Bart leads an integrated approach that brings together psychology, movement, ph"
    manner: ["attuned", "non_judgmental", "motivating"],
    wheelchairAccessible: true,
    appointmentLength: "Times set with the practice; booked online through HotDoc",
    booking: { via: "practice", url: "https://www.hotdoc.com.au/medical-centres/bundall-QLD-4217/atlantis-recovery-centre/doctors/bart-traynor-1", note: "Atlantis Recovery Centre books through HotDoc." },
    realPerson: true,
  },
  {
    id: "jeff-leech",
    name: "Jeff Leech",
    shortName: "Jeff",
    profession: "psychologist",
    gender: "man",
    pronouns: "he/him",
    title: "Clinical psychologist, MClinPsych BPsychSc(Hons)",
    suburb: "Bundall",
    practice: "Atlantis Recovery Centre",
    reach: "Clinic appointments in Bundall, on the Gold Coast",
    image: "/clinicians/jeff-leech.jpg",
    acceptingNewPatients: true,
    focus: "Clinical psychologist using schema therapy and ACT for trauma, anxiety, depression and performance.",
    matchLine: "Clinical psychologist using schema therapy and ACT for trauma, anxiety, depression and performance.",
    fitSignals: ["Trauma", "Anxiety & depression", "Schema therapy & ACT"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Jeff is passionate about helping people overcome life’s most complex challenges. Whether you’re recovering from trauma, managing anxiety or depression, or striving to perform at your best, Jeff provides personalised, evidence-based care using Schema Therapy, ACT, and Activity-Based Psychotherapy.",
    about: "Jeff is passionate about helping people overcome life’s most complex challenges. Whether you’re recovering from trauma, managing anxiety or depression, or striving to perform at your best, Jeff provides personalised, evidence-based care using Schema Therapy, ACT, and Activity-Based Psychotherapy. He is also completing advanced training in Psychedelic-Assisted Therapy, combining proven approaches with emerging treatments to help clients achieve lasting change.",
    experience: ["Clinical psychologist, Atlantis Recovery Centre, Bundall", "Schema Therapy, Acceptance and Commitment Therapy (ACT) and Activity-Based Psychotherapy", "Trauma, anxiety, depression and performance", "Advanced training in Psychedelic-Assisted Therapy, in progress", "Master of Clinical Psychology, University of Queensland", "Bachelor of Psychological Science (Honours), Southern Cross University", "Background in outdoor education, military service, emergency services and adventure and endurance events"],
    languages: ["English"],
    careAreas: ["depression", "anxiety", "trauma-informed", "work-career"],
    careAreasSometimes: ["movement-exercise"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "work-career": "striving to perform at your best", "movement-exercise": "Activity-Based Psychotherapy" },
    manner: [],
    mannerPending: "2026-09-29: listed from their public profile; manner is theirs to declare at their interview.",
    wheelchairAccessible: true,
    appointmentLength: "Times set with the practice; booked online through HotDoc",
    booking: { via: "practice", url: "https://www.hotdoc.com.au/medical-centres/bundall-QLD-4217/atlantis-recovery-centre/doctors", note: "Atlantis Recovery Centre books through HotDoc." },
    realPerson: true,
  },
  {
    id: "michael-rehardt",
    name: "Michael Rehardt",
    shortName: "Michael",
    profession: "psychologist",
    gender: "man",
    pronouns: "he/him",
    title: "Provisional psychologist",
    suburb: "Bundall",
    practice: "Atlantis Recovery Centre",
    reach: "Clinic appointments in Bundall, on the Gold Coast",
    image: "/clinicians/michael-rehardt.jpg",
    acceptingNewPatients: true,
    focus: "Provisional psychologist on the final placement of his Master of Clinical Psychology at Griffith University.",
    matchLine: "Provisional psychologist on the final placement of his Master of Clinical Psychology at Griffith University.",
    fitSignals: ["Final placement", "Master of Clinical Psychology", "Aboriginal artist"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Michael is completing his final externship placement at Atlantis Recovery Centre as part of his Master of Clinical Psychology at Griffith University. He brings a thoughtful, creative and practical approach to his work and is continuing to build his clinical experience across a range of presentations.",
    about: "Michael is completing his final externship placement at Atlantis Recovery Centre as part of his Master of Clinical Psychology at Griffith University. He brings a thoughtful, creative and practical approach to his work and is continuing to build his clinical experience across a range of presentations. Outside psychology, Michael is also an Aboriginal artist and former competitive sprinter, bringing creativity, discipline and a unique perspective to the Atlantis team.",
    experience: ["Provisional psychologist on a final externship placement, Atlantis Recovery Centre, Bundall", "Master of Clinical Psychology, Griffith University, in progress", "Building clinical experience across a range of presentations", "Aboriginal artist and former competitive sprinter"],
    languages: ["English"],
    careAreas: [],
    // motivating, in their words: "Michael is completing his final externship placement at Atlantis Recovery Centre as part of his Master of Clinical Psych"
    manner: ["motivating"],
    wheelchairAccessible: true,
    appointmentLength: "Times set with the practice; booked online through HotDoc",
    booking: { via: "practice", url: "https://www.hotdoc.com.au/medical-centres/bundall-QLD-4217/atlantis-recovery-centre/doctors", note: "Atlantis Recovery Centre books through HotDoc." },
    realPerson: true,
  },
  {
    id: "sarah-savage",
    name: "Sarah Savage",
    shortName: "Sarah",
    profession: "exercise-physiologist",
    expertise: ["exercise-adherence"],
    gender: "woman",
    pronouns: "she/her",
    title: "Exercise physiologist, BExSc GradDipExSc",
    suburb: "Bundall",
    practice: "Atlantis Recovery Centre",
    reach: "Clinic appointments in Bundall, on the Gold Coast",
    image: "/clinicians/sarah-savage.jpg",
    acceptingNewPatients: true,
    focus: "Senior exercise physiologist using Pilates and hydrotherapy, with an interest in older adults.",
    matchLine: "Senior exercise physiologist using Pilates and hydrotherapy, with an interest in older adults.",
    fitSignals: ["Exercise as Medicine", "Pilates & hydrotherapy", "Older adults"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "‘Exercise as Medicine’ … Sarah lives and breathes her mantra. Sarah is passionate about helping people move with confidence, build strength, and enjoy a better quality of life.",
    about: "‘Exercise as Medicine’ … Sarah lives and breathes her mantra. Sarah is passionate about helping people move with confidence, build strength, and enjoy a better quality of life. She has a particular interest in supporting older adults and brings warmth, intelligence, and genuine care to every session. Sarah combines her Exercise Physiology expertise with Pilates, Functional Range Conditioning, and hydrotherapy to create safe, personalised programs that make exercise feel achievable, empowering, and enjoyable.",
    experience: ["Senior exercise physiologist, Atlantis Recovery Centre, Bundall", "Pilates, Functional Range Conditioning and hydrotherapy", "Particular interest in supporting older adults", "Bachelor and Graduate Diploma in Exercise Science, Griffith University"],
    languages: ["English"],
    careAreas: ["movement-exercise"],
    careAreasSometimes: ["non-medication"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "movement-exercise": "\u2018Exercise as Medicine\u2019, Sarah lives and breathes her mantra" },
    // motivating, in their words: "‘Exercise as Medicine’ … Sarah lives and breathes her mantra. Sarah is passionate about helping people move with confide"
    // non_judgmental, in their words: "Sarah combines her Exercise Physiology expertise with Pilates, Functional Range Conditioning, and hydrotherapy to create"
    manner: ["motivating", "non_judgmental"],
    wheelchairAccessible: true,
    appointmentLength: "Times set with the practice; booked online through HotDoc",
    booking: { via: "practice", url: "https://www.hotdoc.com.au/medical-centres/bundall-QLD-4217/atlantis-recovery-centre/doctors/sarah-savage", note: "Atlantis Recovery Centre books through HotDoc." },
    realPerson: true,
  },
  {
    id: "yuri-lima",
    name: "Dr Yuri Lima",
    shortName: "Yuri",
    profession: "physiotherapist",
    gender: "man",
    pronouns: "he/him",
    title: "Physiotherapist, PhD, Master in Rehabilitation Sciences",
    suburb: "Bundall",
    practice: "Atlantis Recovery Centre",
    reach: "Clinic appointments in Bundall, on the Gold Coast",
    image: "/clinicians/yuri-lima.jpg",
    acceptingNewPatients: true,
    focus: "Physiotherapist in orthopaedic and sports rehabilitation, with a PhD on ACL injuries in athletes.",
    matchLine: "Physiotherapist in orthopaedic and sports rehabilitation, with a PhD on ACL injuries in athletes.",
    fitSignals: ["Sports rehabilitation", "Orthopaedic rehab", "PhD, ACL injuries"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "With a lifelong passion for movement and sports, Yuri’s approach combines clinical expertise in orthopaedic and sports rehabilitation and patient-centred care to help clients return to their optimal level of function and performance. He believes in empowering individuals through education and active involvement in their recovery process.",
    about: "With a lifelong passion for movement and sports, Yuri’s approach combines clinical expertise in orthopaedic and sports rehabilitation and patient-centred care to help clients return to their optimal level of function and performance. He believes in empowering individuals through education and active involvement in their recovery process. He is also committed to advancing the field of physiotherapy by holding a Master in Rehabilitation Sciences and a PhD where he investigated ACL injuries in Athletes.",
    experience: ["Physiotherapist, Atlantis Recovery Centre, Bundall", "Orthopaedic and sports rehabilitation", "PhD investigating ACL injuries in athletes", "Master in Rehabilitation Sciences"],
    languages: ["English", "Portuguese"],
    careAreas: ["movement-exercise"],
    careAreasSometimes: ["non-medication"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "movement-exercise": "clinical expertise in orthopaedic and sports rehabilitation" },
    // attuned, in their words: "With a lifelong passion for movement and sports, Yuri’s approach combines clinical expertise in orthopaedic and sports r"
    // non_judgmental, in their words: "With a lifelong passion for movement and sports, Yuri’s approach combines clinical expertise in orthopaedic and sports r"
    manner: ["attuned", "non_judgmental"],
    wheelchairAccessible: true,
    appointmentLength: "Times set with the practice; booked online through HotDoc",
    booking: { via: "practice", url: "https://www.hotdoc.com.au/medical-centres/bundall-QLD-4217/atlantis-recovery-centre/doctors", note: "Atlantis Recovery Centre books through HotDoc." },
    realPerson: true,
  },
  {
    id: "tom-hissey",
    name: "Tom Hissey",
    shortName: "Tom",
    profession: "physiotherapist",
    gender: "man",
    pronouns: "he/him",
    title: "Physiotherapist",
    suburb: "Bundall",
    practice: "Atlantis Recovery Centre",
    reach: "Clinic appointments in Bundall, on the Gold Coast",
    image: "/clinicians/tom-hissey.jpg",
    acceptingNewPatients: true,
    focus: "Musculoskeletal and occupational rehabilitation physiotherapist, and an Australian Army veteran.",
    matchLine: "Musculoskeletal and occupational rehabilitation physiotherapist, and an Australian Army veteran.",
    fitSignals: ["Musculoskeletal physio", "Return to function", "Army veteran"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Tom is an incredibly welcoming Australian Army veteran with experience in both occupational rehabilitation and musculoskeletal physiotherapy, including overseas work supporting UK military personnel. He specialises in helping people return to full function, from young athletes to older clients, drawing on experience in a high-performance setting in Glasgow working with runners, HYROX athletes, and footballers.",
    about: "Tom is an incredibly welcoming Australian Army veteran with experience in both occupational rehabilitation and musculoskeletal physiotherapy, including overseas work supporting UK military personnel. He specialises in helping people return to full function, from young athletes to older clients, drawing on experience in a high-performance setting in Glasgow working with runners, HYROX athletes, and footballers. Having gone through back surgery and rehab himself, Tom understands what recovery really takes. He combines clinical expertise with genuine care, helping clients rebuild strength and confidence as part of Atlantis’s whole person approach to movement and wellbeing.",
    experience: ["Senior physiotherapist, Atlantis Recovery Centre, Bundall", "Occupational rehabilitation and musculoskeletal physiotherapy", "Overseas work supporting UK military personnel", "High-performance setting in Glasgow: runners, HYROX athletes and footballers", "Australian Army veteran"],
    languages: ["English"],
    careAreas: ["movement-exercise"],
    careAreasSometimes: ["non-medication", "work-career"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "movement-exercise": "helping people return to full function, from young athletes to older clients", "work-career": "occupational rehabilitation" },
    // attuned, in their words: "Having gone through back surgery and rehab himself, Tom understands what recovery really takes. He combines clinical exp"
    // motivating, in their words: "Having gone through back surgery and rehab himself, Tom understands what recovery really takes. He combines clinical exp"
    manner: ["attuned", "motivating"],
    wheelchairAccessible: true,
    appointmentLength: "Times set with the practice; booked online through HotDoc",
    booking: { via: "practice", url: "https://www.hotdoc.com.au/medical-centres/bundall-QLD-4217/atlantis-recovery-centre/doctors", note: "Atlantis Recovery Centre books through HotDoc." },
    realPerson: true,
  },
  {
    id: "lester-rafanan",
    name: "Lester Rafanan",
    shortName: "Lester",
    profession: "physiotherapist",
    gender: "man",
    pronouns: "he/him",
    title: "Physiotherapist, Doctor of Physiotherapy, Bond University",
    suburb: "Bundall",
    practice: "Atlantis Recovery Centre",
    reach: "Clinic appointments in Bundall, on the Gold Coast",
    image: "/clinicians/lester-rafanan.jpg",
    acceptingNewPatients: true,
    focus: "Physiotherapist for recovery from injury or surgery, chronic pain, return to sport and NDIS supports.",
    matchLine: "Physiotherapist for recovery from injury or surgery, chronic pain, return to sport and NDIS supports.",
    fitSignals: ["Doctor of Physiotherapy", "Strength & conditioning", "NDIS supports"],
    practicalSignals: ["Fee quoted when you book"],
    summary: "Lester Rafanan graduated with a Doctor of Physiotherapy from Bond University and has a background in personal training, strength and conditioning, and competitive sport, giving Lester a strong understanding of movement, performance, and injury prevention.",
    about: "Lester Rafanan graduated with a Doctor of Physiotherapy from Bond University and has a background in personal training, strength and conditioning, and competitive sport, giving Lester a strong understanding of movement, performance, and injury prevention. He takes an evidence-based, personalised approach to physiotherapy, whether you’re recovering from an injury or surgery, managing chronic pain, returning to sport, accessing NDIS supports, or simply wanting to stay active. Every treatment plan is tailored to your goals so you can move with confidence.",
    experience: ["Physiotherapist, Atlantis Recovery Centre, Bundall", "Doctor of Physiotherapy, Bond University", "Background in personal training, strength and conditioning, and competitive sport", "Injury and surgery recovery, chronic pain, return to sport and NDIS supports"],
    languages: ["English"],
    careAreas: ["movement-exercise"],
    careAreasSometimes: ["non-medication"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "movement-exercise": "recovering from an injury or surgery, managing chronic pain, returning to sport, accessing NDIS supports" },
    ndis: true, // in their words: "accessing NDIS supports"
    // motivating, in their words: "Strength & conditioning"
    manner: ["motivating"],
    wheelchairAccessible: true,
    appointmentLength: "Times set with the practice; booked online through HotDoc",
    booking: { via: "practice", url: "https://www.hotdoc.com.au/medical-centres/bundall-QLD-4217/atlantis-recovery-centre/doctors", note: "Atlantis Recovery Centre books through HotDoc." },
    realPerson: true,
  },
  {
    id: "alex-lawson",
    livedExperience: true,
    name: "Alex Lawson",
    shortName: "Alex",
    profession: "adhd-coach",
    gender: "man",
    pronouns: "he/him",
    title: "ADHD coach, MTeach(Sec) LLB",
    suburb: "Sutherland",
    practice: "Lawson ADHD Solutions",
    reach: "In-person sessions at Sutherland in the Sutherland Shire, and online by Zoom",
    image: "/clinicians/alex-lawson.jpg",
    acceptingNewPatients: true,
    focus: "ADHD coach, teacher and former lawyer with ADHD, working with adults, students and parents.",
    matchLine: "ADHD coach, teacher and former lawyer with ADHD, working with adults, students and parents.",
    fitSignals: ["Adults, students & parents", "Executive functioning", "Lived experience of ADHD"],
    practicalSignals: ["$85 per 55-minute session", "Free 20-minute discovery call", "Telehealth"],
    summary: "I’m Alex. I’m an ADHD coach, high school teacher and former lawyer, and I know what it’s like to work in high-pressure environments and navigate the demands of a busy brain.",
    about: "I’m Alex. I’m an ADHD coach, high school teacher and former lawyer, and I know what it’s like to work in high-pressure environments and navigate the demands of a busy brain. I’ve been living with ADHD for over 30 years, and today I support adults, students, parents and families who are trying to make sense of ADHD in everyday life. Over that time, I’ve learned what it feels like to want to start something and just not be able to. To work hard, care deeply, and still feel like it doesn’t show the way it should. For the past decade, I’ve also had the privilege of supporting people with ADHD professionally. As a high school teacher, ADHD coach, educational leader, and through my previous career in law, I’ve helped students, parents, educators, and professionals better understand ADHD, navigate its challenges, and build practical strategies that are useful in real life. Long before I became an ADHD coach, I noticed something else happening around me. I was the person people came to when they didn’t understand ADHD. Students who felt like they were failing but weren’t. Parents who were exhausted and trying everything they could. Partners who didn’t know how to support someone they loved. Teachers and colleagues trying to make sense of behaviour that didn’t fit the system. And in every conversation, the goal was the same: to help people feel less blamed, less confused, and more understood. Today, I combine lived experience with years of professional practice to help people with ADHD make life more manageable, understand what is getting in the way, and find practical ways forward. That’s why Lawson ADHD Solutions exists. There’s no single planner, app, or system that works for every ADHD brain. My role is to understand how your ADHD shows up in your life specifically, then help you build strategies that actually fit. The goal is simple: you leave each session feeling understood, more confident, and knowing exactly what to do next.",
    experience: ["ADHD coach and mentor, Lawson ADHD Solutions, Sutherland", "Almost a decade of high school teaching and school leadership, as Head Teacher and Year Advisor", "Master of Teaching (Secondary) with Distinction, University of Wollongong", "Bachelor of Laws (LLB), and a previous career in law", "PESI ADHD Coaching Course", "Mentored by ADHD coach Mark Brandtman", "More than 50 families, adults and students supported through one-to-one coaching in six months", "Proficient High School Teacher Accreditation", "Listed in the ADHD Support Australia directory"],
    languages: ["English"],
    careAreas: ["non-medication", "executive-function", "work-career", "study-school", "parenting"],
    careAreasSometimes: ["relationships", "late-diagnosis", "child-adolescent-adhd"],
    // O261: each life-domain declaration with the clinician's own sentence behind it.
    careEvidence: { "child-adolescent-adhd": "today I support adults, students, parents and families", "executive-function": "I\u2019ve learned what it feels like to want to start something and just not be able to", "work-career": "I know what it\u2019s like to work in high-pressure environments; students, parents, educators, and professionals", "study-school": "Students who felt like they were failing but weren\u2019t", "parenting": "Parents who were exhausted and trying everything they could", "relationships": "Partners who didn\u2019t know how to support someone they loved", "late-diagnosis": "trying to make sense of ADHD in everyday life" },
    // sense_making, in their words: "I’ve been living with ADHD for over 30 years, and today I support adults, students, parents and families who are trying "
    // non_judgmental, in their words: "I’ve been living with ADHD for over 30 years, and today I support adults, students, parents and families who are trying "
    // motivating, in their words: "For the past decade, I’ve also had the privilege of supporting people with ADHD professionally. As a high school teacher"
    // attuned, in their words: "Long before I became an ADHD coach, I noticed something else happening around me. I was the person people came to when t"
    manner: ["sense_making", "non_judgmental", "motivating", "attuned"],
    wheelchairAccessible: false,
    appointmentLength: "55-minute sessions, most often weekly or fortnightly to start, moving to monthly as things settle",
    telehealthFirstAppointment: true,
    booking: { via: "practice", url: "https://lawsonadhdsolutions.com.au/book-here", note: "Lawson ADHD Solutions takes bookings on its own website." },
    realPerson: true,
  },
  // Nurtured Thoughts Psychology (2026-10-01): sixteen clinicians, from revamped-adhd.me's cards (the visible layer) and their own pages
  // (profileDetail, the backend layer), by scripts/import-nurtured-thoughts.mjs.
  {
    id: "jae-cho",
    name: "Dr Jae Cho",
    shortName: "Dr Cho",
    profession: "psychiatrist",
    gender: "man",
    pronouns: "he/him",
    title: "Specialist Psychiatrist, MD, FRANZCP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/jae-cho.jpg",
    acceptingNewPatients: true,
    focus: "Thorough, compassionate general psychiatry, with calm explanations that make difficult topics feel manageable and clear.",
    matchLine: "Thorough, compassionate general psychiatry, with calm explanations that make difficult topics feel manageable and clear.",
    fitSignals: [
      "General psychiatry",
      "ADHD",
      "Trauma-informed"
    ],
    practicalSignals: [
      "$900 initial, $395–$445 review, Medicare rebate applies; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Jae Cho is a specialist psychiatrist who provides thorough, compassionate care across all areas of general psychiatry, with a strong interest in anxiety, depression, insomnia, trauma, ADHD, personality disorder, bipolar disorder, OCD, addiction and other complex mental health conditions. Patients appreciate his calm manner, thoughtful explanations, and ability to make difficult topics feel manageable and clear.",
    about: "Dr Jae Cho is a specialist psychiatrist who provides thorough, compassionate care across all areas of general psychiatry, with a strong interest in anxiety, depression, insomnia, trauma, ADHD, personality disorder, bipolar disorder, OCD, addiction and other complex mental health conditions. Patients appreciate his calm manner, thoughtful explanations, and ability to make difficult topics feel manageable and clear. Jae’s approach is evidence-based, trauma-informed, and grounded in the biopsychosocial model. He takes the time to understand each patient’s background, strengths, and goals, and works collaboratively to create a tailored treatment plan. He values close partnership with GPs, psychologists, families, and other clinicians to ensure holistic, coordinated care. He is a Fellow of the Royal Australian and New Zealand College of Psychiatrists and completed his medical degree at Western Sydney University before undertaking specialist psychiatric training across major hospitals in Sydney. His experience spans acute inpatient care, community mental health, consultation-liaison psychiatry, and outpatient management of complex cases. He also supervises psychiatry trainees and medical students.",
    experience: [
      "Specialist psychiatrist, Nurtured Thoughts Psychology, Graceville",
      "Fellow of the Royal Australian and New Zealand College of Psychiatrists",
      "Medical degree, Western Sydney University",
      "Specialist psychiatric training across major Sydney hospitals",
      "Acute inpatient, community mental health, consultation-liaison and outpatient psychiatry",
      "Supervises psychiatry trainees and medical students"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "trauma-informed",
      "anxiety",
      "depression",
      "complex-mental-health",
      "sleep",
      "substance-history"
    ],
    careAreasSometimes: [
      "adhd-assessment"
    ],
    careEvidence: {
      "trauma-informed": "Trauma-informed",
      anxiety: "Anxiety",
      depression: "Depression",
      "complex-mental-health": "Bipolar disorder",
      "adhd-assessment": "ADHD",
      sleep: "Insomnia",
      "substance-history": "Addiction"
    },
    manner: [
      "steadying",
      "non_judgmental",
      "structured"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/jae-cho",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Jae at a Glance": [
          "Dr Jae Cho is a specialist psychiatrist who provides thorough, compassionate care across all areas of general psychiatry. He has a strong interest in supporting patients experiencing:",
          "• Anxiety",
          "• Depression",
          "• Insomnia",
          "• Trauma",
          "• ADHD",
          "• Personality disorder",
          "• Bipolar disorder",
          "• OCD",
          "• Addiction",
          "• Other complex mental health conditions.",
          "Patients appreciate his calm manner, thoughtful explanations, and ability to make difficult topics feel manageable and clear.",
          "Jae’s approach is evidence-based, trauma-informed, and grounded in the biopsychosocial model. He takes the time to understand each patient’s background, strengths, and goals, and works collaboratively to create a tailored treatment plan. He values close partnership with GPs, psychologists, families, and other clinicians to ensure holistic, coordinated care.",
          "He is a Fellow of the Royal Australian and New Zealand College of Psychiatrists and completed his medical degree at Western Sydney University before undertaking specialist psychiatric training across major hospitals in Sydney. His experience spans acute inpatient care, community mental health, consultation-liaison psychiatry, and outpatient management of complex cases.",
          "In addition to his clinical work, Jae is actively involved in medical education. He supervises psychiatry trainees and medical students, contributing to the development of the next generation of psychiatrists. His commitment to teaching reflects his passion for clear communication, clinical excellence, and high-quality patient care.",
          "Jae welcomes patients seeking a thoughtful, thorough, and supportive psychiatric assessment and values working with individuals who want to understand their condition and move towards meaningful change."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "rajitha-de-silva",
    name: "Dr Rajitha De Silva",
    shortName: "Dr De Silva",
    profession: "psychiatrist",
    gender: "woman",
    pronouns: "she/her",
    title: "Consultant Psychiatrist, FRANZCP, Board Certification in Psychiatry, MD (Psychiatry)",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/rajitha-de-silva.jpg",
    acceptingNewPatients: true,
    focus: "Over 16 years caring for adults, with a culturally sensitive approach that begins with feeling heard.",
    matchLine: "Over 16 years caring for adults, with a culturally sensitive approach that begins with feeling heard.",
    fitSignals: [
      "Adults",
      "Anxiety & mood",
      "Culturally sensitive"
    ],
    practicalSignals: [
      "$900 initial, $395–$445 review, Medicare rebate applies; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Rajitha Marcellin De Silva is a compassionate consultant psychiatrist with over 16 years of experience caring for adults experiencing a wide range of mental health concerns. Having practised in both Sri Lanka and Australia, she brings a thoughtful, culturally sensitive approach to helping people navigate life’s challenges.",
    about: "Dr Rajitha Marcellin De Silva is a compassionate consultant psychiatrist with over 16 years of experience caring for adults experiencing a wide range of mental health concerns. Having practised in both Sri Lanka and Australia, she brings a thoughtful, culturally sensitive approach to helping people navigate life’s challenges. She believes that the best care begins with feeling heard. Rajitha takes the time to understand each person’s unique experiences, concerns, and goals, creating a safe, supportive, and non-judgemental environment where patients feel comfortable discussing even the most difficult issues. Her approach combines empathy with evidence-based medicine, working collaboratively with patients to develop personalised treatment plans that reflect the latest research while respecting individual preferences and circumstances.",
    experience: [
      "Consultant psychiatrist, Nurtured Thoughts Psychology, Graceville",
      "Over 16 years caring for adults, in Sri Lanka and Australia",
      "Fellow of the Royal Australian and New Zealand College of Psychiatrists",
      "MD (Psychiatry) and Board Certification in Psychiatry",
      "Particular interests in anxiety, depression, bipolar, OCD, trauma and psychosis"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "anxiety",
      "depression",
      "complex-mental-health",
      "trauma-informed",
      "cultural-background"
    ],
    careAreasSometimes: [],
    careEvidence: {
      anxiety: "Anxiety & mood",
      depression: "depression",
      "complex-mental-health": "bipolar",
      "trauma-informed": "trauma",
      "cultural-background": "Culturally sensitive."
    },
    manner: [
      "attuned",
      "non_judgmental"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/rajitha-dinushini",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Rajitha at a Glance": [
          "Dr Rajitha Marcellin De Silva is a compassionate consultant psychiatrist with over 16 years of experience caring for adults experiencing a wide range of mental health concerns. Having practised in both Sri Lanka and Australia, she brings a thoughtful, culturally sensitive approach to helping people navigate life’s challenges.",
          "She believes that the best care begins with feeling heard. Rajitha takes the time to understand each person’s unique experiences, concerns, and goals, creating a safe, supportive, and non-judgemental environment where patients feel comfortable discussing even the most difficult issues.",
          "Her approach combines empathy with evidence-based medicine, working collaboratively with patients to develop personalised treatment plans that reflect the latest research while respecting individual preferences and circumstances. She is committed to helping people achieve meaningful improvements in their mental health, wellbeing, and quality of life.",
          "Rajitha has particular interests in anxiety, depression, bipolar, OCD, trauma and psychosis"
        ]
      }
    },
    realPerson: true
  },
  {
    id: "beth-hansen",
    name: "Dr Beth Hansen",
    shortName: "Dr Hansen",
    gender: "woman",
    pronouns: "she/her",
    title: "Specialist GP, MBBS, FRACGP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/beth-hansen.jpg",
    acceptingNewPatients: true,
    focus: "A gentle, practical and thorough ADHD assessment for adults who have spent years masking, overcompensating or pushing through.",
    matchLine: "A gentle, practical and thorough ADHD assessment for adults who have spent years masking, overcompensating or pushing through.",
    fitSignals: [
      "ADHD in women",
      "Late-identified ADHD",
      "ADHD in parents"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Beth Hansen is a GP with a special interest in mental health, adult ADHD and women’s health. A UQ graduate and a Fellow of the Royal Australian College of General Practitioners, she brings a gentle, practical and thorough approach to ADHD assessment and care.",
    about: "Dr Beth Hansen is a GP with a special interest in mental health, adult ADHD and women’s health. A UQ graduate and a Fellow of the Royal Australian College of General Practitioners, she brings a gentle, practical and thorough approach to ADHD assessment and care. Beth is particularly interested in supporting adults who have managed for many years by masking, overcompensating or pushing through, often at the cost of exhaustion, anxiety, self-criticism or burnout. She has a strong interest in how ADHD can present in women, especially when symptoms have been missed, minimised or attributed to other causes. In her consultations, Beth aims to create a space where patients feel heard, understood and taken seriously. She takes time to explore symptoms in the context of a person’s life, including work, study, relationships, parenting, sleep, emotional regulation and mental health. She has worked across urban, rural and remote settings, which has shaped her interest in accessible and compassionate mental health care.",
    experience: [
      "General practice with a special interest in mental health, adult ADHD and women’s health",
      "Fellow of the Royal Australian College of General Practitioners",
      "Medical degree, University of Queensland",
      "Urban, rural and remote practice"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment",
      "emotional-regulation",
      "womens-health",
      "late-diagnosis",
      "parenting"
    ],
    careAreasSometimes: [
      "anxiety"
    ],
    careEvidence: {
      "adhd-assessment": "A gentle, practical and thorough ADHD assessment for adults who have spent years masking, overcompensating or pushing through.",
      "emotional-regulation": "Emotional regulation, self-esteem and relationship impacts of ADHD",
      anxiety: "Beth is particularly interested in supporting adults who have managed for many years by masking, overcompensating or pushing through, often at the cost of exhaustion, anxiety, self-criticism or burnou",
      "womens-health": "ADHD in women.",
      "late-diagnosis": "Late-identified ADHD.",
      parenting: "ADHD in parents."
    },
    manner: [
      "steadying",
      "structured",
      "culturally_attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/beth-hansen",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Beth at a Glance": [
          "Dr Beth Hansen is a GP with a special interest in mental health, adult ADHD and women’s health. As a UQ graduate, she is a Fellow of the Royal Australian College of General Practitioners and brings a gentle, practical and thorough approach to ADHD assessment and care.",
          "Beth is particularly interested in supporting adults who have managed for many years by masking, overcompensating or pushing through, often at the cost of exhaustion, anxiety, self-criticism or burnout. She has a strong interest in how ADHD can present in women, especially when symptoms have been missed, minimised or attributed to other causes.",
          "In her consultations, Beth aims to create a space where patients feel heard, understood and taken seriously. She takes time to explore symptoms in the context of a person’s life, including work, study, relationships, parenting, sleep, emotional regulation and mental health.",
          "Beth has worked across urban, rural and remote settings, which has shaped her interest in accessible and compassionate mental health care.",
          "Her areas of interest include:",
          "• Adult ADHD in young adult and middle aged women",
          "• Late-identified and high-functioning ADHD presentations",
          "• Emotional regulation, self-esteem and relationship impacts of ADHD",
          "• ADHD in parents"
        ]
      }
    },
    realPerson: true
  },
  {
    id: "bill-liley",
    name: "Dr Bill Liley",
    shortName: "Dr Liley",
    gender: "man",
    pronouns: "he/him",
    title: "Specialist GP, FRACGP, FACRRM",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Telehealth from regional Queensland",
    image: "/clinicians/bill-liley.jpg",
    acceptingNewPatients: true,
    focus: "More than 40 years of practice and a whole-person approach to how ADHD shapes your day-to-day life.",
    matchLine: "More than 40 years of practice and a whole-person approach to how ADHD shapes your day-to-day life.",
    fitSignals: [
      "40+ years in practice",
      "Rural & regional",
      "Whole-person care"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Bill Liley is an experienced Rural Generalist GP with more than 40 years of clinical experience and a particular interest in supporting people with ADHD.",
    about: "Dr Bill Liley is an experienced Rural Generalist GP with more than 40 years of clinical experience and a particular interest in supporting people with ADHD. Throughout his career, Bill has worked across metropolitan, regional, rural and remote communities in Queensland, New South Wales and Victoria, including in private practice, community and public hospital settings, Aboriginal Community Controlled Health Organisations, and rural generalist practice. This breadth has given him extensive experience working with people from diverse backgrounds, including many who experience the effects of ADHD in their everyday lives. Bill brings a practical, whole-person approach to ADHD care, taking into consideration each patient’s individual circumstances and how ADHD impacts their day-to-day life. Based in regional Queensland, he also appreciates the accessibility that telehealth provides, particularly for people who may otherwise have difficulty accessing ADHD care.",
    experience: [
      "Rural generalist GP, more than 40 years of clinical experience",
      "Metropolitan, regional, rural and remote practice in Queensland, New South Wales and Victoria",
      "Private practice, community and public hospital settings",
      "Aboriginal Community Controlled Health Organisations"
    ],
    languages: [
      "English"
    ],
    careAreas: [],
    careAreasSometimes: [],
    careEvidence: {},
    manner: [
      "attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/bill-liley",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Bill at a Glance": [
          "Dr Bill Lilley is an experienced Rural Generalist GP with more than 40 years of clinical experience and a particular interest in supporting people with ADHD.",
          "Throughout his career, Bill has worked across metropolitan, regional, rural and remote communities in Queensland, New South Wales and Victoria, including in private practice, community and public hospital settings, Aboriginal Community Controlled Health Organisations, and rural generalist practice.",
          "This breadth of experience has given Bill extensive experience working with people from diverse backgrounds and communities, including many people who experience the effects of ADHD in their everyday lives.",
          "Bill brings a practical, whole-person approach to ADHD care, taking into consideration each patient’s individual circumstances and how ADHD impacts their day-to-day life.",
          "Based in regional Queensland, Bill also appreciates the accessibility and convenience that telehealth provides, particularly for people who may otherwise have difficulty accessing appropriate ADHD care."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "hannah-gray",
    name: "Dr Hannah Gray",
    shortName: "Dr Gray",
    gender: "woman",
    pronouns: "she/her",
    title: "Specialist GP, MBBS, FRACGP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/hannah-gray.jpg",
    acceptingNewPatients: true,
    focus: "Calm, structured and collaborative, explaining each step so you understand the plan and why.",
    matchLine: "Calm, structured and collaborative, explaining each step so you understand the plan and why.",
    fitSignals: [
      "Students & early career",
      "Organisation & follow-through",
      "New to assessment"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Hannah Gray is a warm and approachable GP with a strong interest in mental health and adult ADHD. She works primarily with adults who are managing study, early career roles or professional responsibilities and are concerned that attention, organisation or follow-through difficulties may be affecting their performance and wellbeing.",
    about: "Dr Hannah Gray is a warm and approachable GP with a strong interest in mental health and adult ADHD. She works primarily with adults who are managing study, early career roles or professional responsibilities and are concerned that attention, organisation or follow-through difficulties may be affecting their performance and wellbeing. In consultations, Hannah is calm, structured and collaborative. She takes pride in explaining her thinking and plans clearly so patients understand each step of the process. Her recommendations emphasise practical strategies and realistic next steps that fit a person’s day-to-day life, and she particularly welcomes patients who are new to mental health or ADHD assessment.",
    experience: [
      "General practice with a strong interest in mental health and adult ADHD",
      "Fellow of the Royal Australian College of General Practitioners",
      "Adult ADHD in university students and early-career professionals",
      "Organisation, procrastination and follow-through in study and work"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment",
      "study-school",
      "executive-function",
      "work-career"
    ],
    careAreasSometimes: [],
    careEvidence: {
      "adhd-assessment": "New to assessment",
      "study-school": "Students & early career",
      "executive-function": "Organisation & follow-through",
      "work-career": "early-career professionals"
    },
    manner: [
      "steadying",
      "sense_making",
      "collaborative"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/hannah-gray",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Hannah at a Glance": [
          "Dr Hannah Gray is a warm and approachable GP with a strong interest in mental health and adult ADHD.",
          "She works primarily with adults who are managing study, early career roles or professional responsibilities and are concerned that attention, organisation or follow-through difficulties may be affecting their performance and wellbeing.",
          "In consultations, Hannah is calm, structured and collaborative. She takes pride in explaining her thinking and plans clearly so patients understand each step of the process. Her recommendations emphasise practical strategies and realistic next steps that fit a person’s day-to-day life.",
          "Her areas of clinical interest include:",
          "• Adult ADHD in university students and early-career professionals",
          "• Difficulties with organisation, procrastination and follow‑through in study and work settings",
          "• Supporting patients who are new to mental health or ADHD assessment"
        ]
      }
    },
    realPerson: true
  },
  {
    id: "john-ruberry",
    name: "Dr John Ruberry",
    shortName: "Dr Ruberry",
    gender: "man",
    pronouns: "he/him",
    title: "Specialist GP, MBBS",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/john-ruberry.jpg",
    acceptingNewPatients: true,
    focus: "Thirteen years in community general practice, and passionate about improving access to ADHD care.",
    matchLine: "Thirteen years in community general practice, and passionate about improving access to ADHD care.",
    fitSignals: [
      "13 years in practice",
      "Access to ADHD care",
      "Mental health"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr John is a General Practitioner with 13 years of experience in community general practice, including five years as the owner and principal of his own busy clinic. Throughout his career, he has developed a strong interest in mental health and has seen firsthand the positive difference effective ADHD treatment can make to a person’s quality of life. He is passionate about improving access to ADHD care and supporting patients through their assessment and treatment journey.",
    about: "Dr John is a General Practitioner with 13 years of experience in community general practice, including five years as the owner and principal of his own busy clinic. Throughout his career, he has developed a strong interest in mental health and has seen firsthand the positive difference effective ADHD treatment can make to a person’s quality of life. He is passionate about improving access to ADHD care and supporting patients through their assessment and treatment journey.",
    experience: [
      "13 years in community general practice",
      "Five years as owner and principal of his own clinic",
      "Strong interest in mental health and ADHD treatment"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment"
    ],
    careAreasSometimes: [],
    careEvidence: {
      "adhd-assessment": "Dr John is a General Practitioner with 13 years of experience in community general practice, including five years as the owner and principal of his own busy clinic. Throughout his career, he has devel"
    },
    manner: [
      "non_judgmental"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/john-ruberry",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr John at a Glance": [
          "Dr John is a General Practitioner with 13 years of experience in community general practice, including five years as the owner and principal of his own busy clinic. Throughout his career, he has developed a strong interest in mental health and has seen firsthand the positive difference effective ADHD treatment can make to a person’s quality of life. He is passionate about improving access to ADHD care and supporting patients through their assessment and treatment journey."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "kay-walls",
    name: "Dr Kay Walls",
    shortName: "Dr Walls",
    gender: "woman",
    pronouns: "she/her",
    title: "Specialist GP, MBBS, BHealthSci, FRACGP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/kay-walls.jpg",
    acceptingNewPatients: true,
    focus: "An ADHD assessment that is never just a checklist: room to tell your whole story, and a plan that fits your life.",
    matchLine: "An ADHD assessment that is never just a checklist: room to tell your whole story, and a plan that fits your life.",
    fitSignals: [
      "ADHD in adult women",
      "Mothers & postnatal",
      "Focused Psychological Strategies"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Kay Walls is a specialist general practitioner who brings warmth, curiosity, and a deeply holistic lens to everything she does. With a background spanning mental health and women’s health, she has developed a particular focus on ADHD in adult women, a group she feels has historically been under-recognised and underserved.",
    about: "Dr Kay Walls is a specialist general practitioner who brings warmth, curiosity, and a deeply holistic lens to everything she does. With a background spanning mental health and women’s health, she has developed a particular focus on ADHD in adult women, a group she feels has historically been under-recognised and underserved. For Kay, an ADHD assessment is never just a checklist. She is interested in the whole person, including their history, relationships, long-standing patterns, and the strengths that often sit alongside the challenges. She creates space for patients to tell their story fully, and many describe her consultations as the first time they have felt genuinely listened to. Her interests include supporting mothers and high-functioning women navigating a new ADHD diagnosis, culturally sensitive and person-centred care, and emotional regulation, anxiety and depression, particularly in the postnatal period. She works closely with psychologists, psychiatrists, and allied health providers to ensure coordinated, comprehensive support.",
    experience: [
      "Specialist general practice, with a background in mental health and women’s health",
      "Medical degree, University of Sydney",
      "General practice training, James Cook University; Fellow of the Royal Australian College of General Practitioners",
      "Additional training in Focused Psychological Strategies"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment",
      "depression",
      "anxiety",
      "emotional-regulation",
      "womens-health",
      "perinatal",
      "cultural-background"
    ],
    careAreasSometimes: [],
    careEvidence: {
      "adhd-assessment": "An ADHD assessment that is never just a checklist: room to tell your whole story, and a plan that fits your life.",
      depression: "Emotional regulation, anxiety and depression particularly in the postnatal period",
      anxiety: "Emotional regulation, anxiety and depression particularly in the postnatal period",
      "emotional-regulation": "Emotional regulation, anxiety and depression particularly in the postnatal period",
      "womens-health": "ADHD in adult women.",
      perinatal: "Mothers & postnatal.",
      "cultural-background": "Culturally sensitive and person-centred care."
    },
    manner: [
      "culturally_attuned",
      "attuned",
      "motivating"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/kay-walls",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Kay at a Glance": [
          "Dr Kay Walls is a specialist general practitioner who brings warmth, curiosity, and a deeply holistic lens to everything she does. With a background spanning mental health and women’s health, she has developed a particular focus on ADHD in adult women, a group she feels has historically been under-recognised and underserved.",
          "She completed her medical degree at the University of Sydney, followed by general practice training through James Cook University, where she attained Fellowship with the Royal Australian College of General Practitioners. She has also undertaken additional training in Focused Psychological Strategies (FPS), allowing her to integrate psychological support into her care.",
          "For Kay, an ADHD assessment is never just a checklist. She is interested in the whole person, including their history, relationships, long-standing patterns, and the strengths that often sit alongside the challenges. She creates space for patients to tell their story fully, and many describe her consultations as the first time they have felt genuinely listened to.",
          "Her areas of interest include:",
          "• Supporting mothers and high-functioning women navigating a new ADHD diagnosis",
          "• Culturally sensitive and person-centred care",
          "• Emotional regulation, anxiety and depression particularly in the postnatal period",
          "• Holistic, personalised care planning.",
          "Kay’s approach is warm, thorough, and deeply patient-centred. She takes time to understand the full picture, including a patient’s history, day-to-day challenges, strengths, and goals, before developing a care plan that is practical and tailored to their life. She works closely with psychologists, psychiatrists, and allied health providers to ensure coordinated, comprehensive support.",
          "She welcomes patients who are looking for a practitioner who will take their concerns seriously, ask thoughtful questions, and walk alongside them towards greater clarity, confidence, and wellbeing."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "natalie-cook",
    name: "Dr Natalie Cook",
    shortName: "Dr Cook",
    gender: "woman",
    pronouns: "she/her",
    title: "Specialist GP, MBBS, FRACGP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/natalie-cook.jpg",
    acceptingNewPatients: true,
    focus: "Direct, honest and safety-focused advice, tailored to your work, sleep, family and day-to-day demands.",
    matchLine: "Direct, honest and safety-focused advice, tailored to your work, sleep, family and day-to-day demands.",
    fitSignals: [
      "Complex adult ADHD",
      "Evidence-based",
      "Central Queensland"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Natalie Cook is a Russian-born and trained GP who has practised in Central Queensland for over 11 years. She holds FRACGP and AMC qualifications in Australia.",
    about: "Dr Natalie Cook is a Russian-born and trained GP who has practised in Central Queensland for over 11 years. She holds FRACGP and AMC qualifications in Australia. Her approach is direct, honest and safety-focused, providing clear, evidence-based advice while tailoring treatment to each patient’s individual circumstances, preferences and goals, including their work, sleep, family and day-to-day demands. She has extensive experience assessing and managing adults with ADHD, including complex cases requiring collaboration with psychiatrists and other specialists.",
    experience: [
      "General practice in Central Queensland for over 11 years",
      "Russian-born and trained; FRACGP and AMC qualifications in Australia",
      "Assessing and managing adults with ADHD, including complex cases with psychiatrists and other specialists"
    ],
    languages: [
      "English"
    ],
    careAreas: [],
    careAreasSometimes: [],
    careEvidence: {
    },
    manner: [
      "non_judgmental",
      "culturally_attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/natalie-cook",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Natalie at a Glance": [
          "Dr Natalie Cook is a Russian-born and trained GP who has practised in Central Queensland for over 11 years. She holds FRACGP and AMC qualifications in Australia.",
          "Her approach is direct, honest and safety-focused, providing clear, evidence-based advice while tailoring treatment to each patient’s individual circumstances, preferences and goals, including their work, sleep, family and day-to-day demands.",
          "She has extensive experience assessing and managing adults with ADHD, including complex cases requiring collaboration with psychiatrists and other specialists."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "richard-hostiadi",
    name: "Dr Richard Hostiadi",
    shortName: "Dr Hostiadi",
    gender: "man",
    pronouns: "he/him",
    title: "Specialist GP, MBBS, FRACGP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/richard-hostiadi.jpg",
    acceptingNewPatients: true,
    focus: "Adult ADHD, men’s mental health and lifestyle medicine, with real insight into demanding, high-pressure work.",
    matchLine: "Adult ADHD, men’s mental health and lifestyle medicine, with real insight into demanding, high-pressure work.",
    fitSignals: [
      "Men’s mental health",
      "ADHD at work",
      "Lifestyle medicine"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Richard Hostiadi is a Fellow of the Royal Australian College of General Practitioners with a focus on adult ADHD, men’s mental health and lifestyle medicine. Before studying medicine, he worked as a Registered Nurse at St Vincent’s Hospital in Sydney across a range of clinical areas for several years.",
    about: "Dr Richard Hostiadi is a Fellow of the Royal Australian College of General Practitioners with a focus on adult ADHD, men’s mental health and lifestyle medicine. Before studying medicine, he worked as a Registered Nurse at St Vincent’s Hospital in Sydney across a range of clinical areas for several years. He also worked in workers’ compensation, life insurance and disability claims. Together with his experience as a General Practitioner and Medical Officer in the Royal Australian Navy Reserve, this has given him insight into occupational medicine, workplace health and the challenges faced by professionals, tradespeople and shift workers in physically demanding and high-pressure occupations. Outside medicine, Richard keeps active and has completed half and full marathons, HYROX events, obstacle course races and the Everest Base Camp trek. He lives with his wife and two young boys, and their dog.",
    experience: [
      "Fellow of the Royal Australian College of General Practitioners",
      "Adult ADHD assessments and ongoing management",
      "Medical Officer, Royal Australian Navy Reserve",
      "Registered Nurse, St Vincent’s Hospital, Sydney",
      "Workers’ compensation, life insurance and disability claims"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment",
      "work-career"
    ],
    careAreasSometimes: [
      "movement-exercise",
      "titration"
    ],
    careEvidence: {
      titration: "Adult ADHD assessments and ongoing management",
      "adhd-assessment": "Adult ADHD assessments and ongoing management",
      "work-career": "ADHD at work",
      "movement-exercise": "Lifestyle medicine"
    },
    manner: [
      "culturally_attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/richard-hostiadi",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Richard at a Glance": [
          "Dr Richard Hostiadi is a Fellow of the Royal Australian College of General Practitioners (FRACGP) with a focus on adult ADHD, men’s mental health and lifestyle medicine.",
          "Before studying medicine, Richard worked as a Registered Nurse at St Vincent’s Hospital in Sydney across a range of clinical areas for several years.",
          "Prior to becoming a doctor, Richard also worked in workers’ compensation, life insurance and disability claims. Together with his experience as a General Practitioner and Medical Officer in the Royal Australian Navy Reserve, this has given him valuable insight into occupational medicine, workplace health and the challenges faced by people in physically demanding and high-pressure occupations.",
          "Areas of interest:",
          "• Adult ADHD assessments and ongoing management",
          "• Men’s mental health",
          "• Occupational health and ADHD in working adults, including professionals, tradespeople and shift workers",
          "• Lifestyle medicine to support long-term ADHD management",
          "Outside medicine, Richard enjoys maintaining an active lifestyle and has completed multiple half marathons, full marathons, HYROX events, obstacle course races and the Everest Base Camp trek. He lives with his wife and two young boys and enjoys spending time with his family and their dog."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "sally-mcleod",
    name: "Dr Sally McLeod",
    shortName: "Dr McLeod",
    gender: "woman",
    pronouns: "she/her",
    title: "Specialist GP, MBBS., FRACGP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/sally-mcleod.jpg",
    acceptingNewPatients: true,
    focus: "Helping adolescents and adults understand how their brain works, with thorough, evidence-based assessment.",
    matchLine: "Helping adolescents and adults understand how their brain works, with thorough, evidence-based assessment.",
    fitSignals: [
      "Women & girls",
      "Late diagnosis",
      "Perimenopause"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Sally McLeod completed her medical degree at the University of Queensland in 2009 before her junior doctor training at the Mater Hospital in South Brisbane, and her Fellowship of the Royal Australian College of General Practitioners in 2016.",
    about: "Dr Sally McLeod completed her medical degree at the University of Queensland in 2009 before her junior doctor training at the Mater Hospital in South Brisbane, and her Fellowship of the Royal Australian College of General Practitioners in 2016. Sally has a special interest in ADHD and is passionate about helping adolescents and adults better understand how their brain works. She provides thorough, evidence-based assessments and works collaboratively with patients to develop practical, individualised treatment plans. Her interests include ADHD in women and girls, high-functioning and late-identified ADHD in professionals, perimenopause, and autism, anxiety and depression in the context of neurodivergence. Outside of medicine, Sally enjoys spending time with her three sons. She loves reading, music, and the outdoors, particularly bushwalking, camping and travelling to remote parts of Australia.",
    experience: [
      "Medical degree, University of Queensland, 2009",
      "Junior doctor training, Mater Hospital, South Brisbane",
      "Fellow of the Royal Australian College of General Practitioners, 2016",
      "ADHD in women and girls, including late diagnosis in adulthood",
      "Perimenopause and its interaction with ADHD and mental health"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment",
      "depression",
      "anxiety",
      "autism-adhd",
      "womens-health",
      "late-diagnosis",
      "work-career"
    ],
    careAreasSometimes: [
      "child-adolescent-adhd"
    ],
    careEvidence: {
      "adhd-assessment": "Helping adolescents and adults understand how their brain works, with thorough, evidence-based assessment.",
      "child-adolescent-adhd": "Helping adolescents and adults understand how their brain works, with thorough, evidence-based assessment.",
      depression: "Autism, anxiety and depression in the context of neurodivergence",
      anxiety: "Autism, anxiety and depression in the context of neurodivergence",
      "autism-adhd": "Autism, anxiety and depression in the context of neurodivergence",
      "womens-health": "Perimenopause.",
      "late-diagnosis": "Late diagnosis.",
      "work-career": "High-functioning and late-identified ADHD in professionals."
    },
    manner: [
      "sense_making",
      "structured",
      "attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/sally-mcleod",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Sally at a Glance": [
          "Dr Sally McLeod completed her medical degree at the University of Queensland in 2009 before undertaking her junior doctor training at the Mater Hospital in South Brisbane. She completed her Fellowship of the Royal Australian College of General Practitioners (FRACGP) in 2016.",
          "Sally has a special interest in ADHD and is passionate about helping adolescents and adults better understand how their brain works. She provides thorough, evidence-based assessments and works collaboratively with patients to develop practical, individualised treatment plans.",
          "Areas of interest:",
          "• ADHD in women and girls - including late diagnosis in adulthood",
          "• High-functioning and late-identified ADHD in professionals",
          "• Perimenopause and its interaction with ADHD and mental health",
          "• Autism, anxiety and depression in the context of neurodivergence",
          "Patients appreciate Sally’s warm, approachable nature and the time she takes to listen. She strives to create a supportive, non-judgemental environment where patients feel genuinely heard and cared for.",
          "Outside of medicine, Sally enjoys spending time with her three sons. She loves reading, music, and the outdoors, particularly bushwalking, camping and travelling to remote parts of Australia."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "shwetha-murthy",
    name: "Dr Shwetha Murthy",
    shortName: "Dr Murthy",
    gender: "woman",
    pronouns: "she/her",
    title: "Specialist GP, MBBS, FRACGP, SCHP",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/shwetha-murthy.jpg",
    acceptingNewPatients: true,
    focus: "A structured assessment that maps how ADHD has shown up over time, and what it means for family life at home and at work.",
    matchLine: "A structured assessment that maps how ADHD has shown up over time, and what it means for family life at home and at work.",
    fitSignals: [
      "Parents & carers",
      "ADHD in families",
      "Sydney Child Health Program"
    ],
    practicalSignals: [
      "$1,950 all-inclusive adult ADHD pathway, about $200 Medicare rebate; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Dr Shwetha Murthy is a Specialist General Practitioner with a particular interest in adult ADHD and mental health. Many of the people she sees are managing busy households, caring for children or relatives, and noticing patterns of attention, organisation or emotional regulation that seem to run through the family. She is especially interested in supporting women who are starting to wonder how their own history, their children’s experiences and ADHD might be connected, and in adult ADHD in men across blue-collar and white-collar work.",
    about: "Dr Shwetha Murthy is a Specialist General Practitioner with a particular interest in adult ADHD and mental health. Many of the people she sees are managing busy households, caring for children or relatives, and noticing patterns of attention, organisation or emotional regulation that seem to run through the family. She is especially interested in supporting women who are starting to wonder how their own history, their children’s experiences and ADHD might be connected, and in adult ADHD in men across blue-collar and white-collar work. In consultations, Shwetha brings a calm, organised style and a strong focus on context: childhood experiences, school reports, family roles, cultural background and current life demands. She maps how symptoms have shown up over time, how they interact with mood, sleep and physical health, and what this means day to day, aiming for a structured, clinically sound assessment explained in clear, practical language.",
    experience: [
      "Specialist General Practitioner with a particular interest in adult ADHD and mental health",
      "Medical degree in India; clinical experience in the United Kingdom; in Australia since 2007",
      "Tertiary and regional hospitals in NSW, WA and Queensland: General Medicine, Nephrology, Nuclear Medicine and Radiology",
      "Sydney Child Health Program, University of Sydney"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment",
      "parenting",
      "executive-function",
      "relationships",
      "womens-health",
      "work-career"
    ],
    careAreasSometimes: [
      "child-adolescent-adhd",
      "emotional-regulation",
      "titration"
    ],
    careEvidence: {
      titration: "This breadth of experience underpins her careful, whole‑person approach to ADHD assessment and ongoing management.",
      "adhd-assessment": "A structured assessment that maps how ADHD has shown up over time, and what it means for family life at home and at work.",
      "child-adolescent-adhd": "Dr Shwetha Murthy is a Specialist General Practitioner with a particular interest in adult ADHD and mental health. Many of the people she sees are managing busy households, caring for children or rela",
      "emotional-regulation": "Dr Shwetha Murthy is a Specialist General Practitioner with a particular interest in adult ADHD and mental health. Many of the people she sees are managing busy households, caring for children or rela",
      parenting: "Parents & carers.",
      "executive-function": "executive functioning challenges",
      relationships: "family routines and relationships",
      "womens-health": "Adult ADHD in women who are also parents or carers.",
      "work-career": "Adult ADHD in men across a wide range of roles, from blue‑collar to white‑collar work"
    },
    manner: [
      "culturally_attuned",
      "structured",
      "steadying"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/shwetha-murthy",
      readOn: "2026-10-01",
      sections: {
        "Meet Dr Shwetha at a Glance": [
          "Dr Shwetha Murthy is a Specialist General Practitioner with extensive experience across multiple fields of medicine and a particular interest in adult ADHD and mental health. Many of the people she sees are managing busy households, caring for children or relatives, and noticing patterns of attention, organisation or emotional regulation that seem to run through the family. She is especially interested in supporting women who are starting to wonder how their own history, their children’s experiences and ADHD might be connected.",
          "In consultations, Shwetha brings a calm, organised style and a strong focus on context: childhood experiences, school reports, family roles, cultural background and current life demands. She takes time to map out how symptoms have shown up over time, how they interact with mood, sleep and physical health, and what this means for day‑to‑day life at home and at work. Her goal is to provide a structured, clinically sound assessment and to help patients understand their options in clear, practical language.",
          "Her areas of interest include:",
          "• Adult ADHD in women who are also parents or carers",
          "• How ADHD traits and executive functioning challenges can affect family routines and relationships",
          "• Adult ADHD in men across a wide range of roles, from blue‑collar to white‑collar work",
          "Shwetha obtained her medical degree in India and gained clinical experience in the United Kingdom before relocating to Australia in 2007. She has worked in tertiary and regional hospitals across New South Wales, Western Australia and Queensland, including roles in General Medicine, Nephrology, Nuclear Medicine and Radiology, and has completed the Sydney Child Health Program through the University of Sydney. This breadth of experience underpins her careful, whole‑person approach to ADHD assessment and ongoing management.",
          "Shwetha welcomes adults who are curious about how ADHD might be affecting not just themselves but their family life, and who are looking for a thoughtful assessment and a coordinated plan that takes their wider responsibilities into account."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "heather-mcauliffe",
    name: "Heather McAuliffe",
    shortName: "Heather McAuliffe",
    gender: "undeclared",
    pronouns: "",
    profession: "psychologist",
    title: "Clinical Psychologist",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/heather-mcauliffe.jpg",
    acceptingNewPatients: true,
    focus: "A neurodivergent clinical psychologist who makes assessment warm and safe, and treats you as the expert on your own experience.",
    matchLine: "A neurodivergent clinical psychologist who makes assessment warm and safe, and treats you as the expert on your own experience.",
    fitSignals: [
      "Neurodevelopmental assessment",
      "Neurodivergent clinician",
      "Collaborative care"
    ],
    practicalSignals: [
      "Set and charged by the practice; quoted when you book",
      "Telehealth"
    ],
    summary: "Heather is a neurodivergent Clinical Psychologist with a particular interest in neurodevelopment. Her background includes private and community practice, where she has engaged in detailed assessment and diagnosis, therapeutic intervention, and collaborative care coordination.",
    about: "Heather is a neurodivergent Clinical Psychologist with a particular interest in neurodevelopment. Her background includes private and community practice, where she has engaged in detailed assessment and diagnosis, therapeutic intervention, and collaborative care coordination. She strives to ensure that the assessment process provides warmth, safety, and supportive recommendations, valuing the individual as the expert of their own experiences. Her approach is collaborative, and she often consults with paediatricians, psychiatrists, clinical psychologists, and other allied health professionals for a holistic understanding of each person’s needs.",
    experience: [
      "Clinical psychologist with a particular interest in neurodevelopment",
      "Private and community practice",
      "Detailed assessment and diagnosis, therapeutic intervention and care coordination",
      "Consults with paediatricians, psychiatrists and allied health professionals"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "adhd-assessment"
    ],
    careAreasSometimes: [
      "autism-adhd"
    ],
    careEvidence: {
      "adhd-assessment": "A neurodivergent clinical psychologist who makes assessment warm and safe, and treats you as the expert on your own experience.",
      "autism-adhd": "neurodivergent"
    },
    manner: [
      "non_judgmental",
      "collaborative"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/heather-mcauliffe",
      readOn: "2026-10-01",
      sections: {
        "Meet Heather at a Glance": [
          "Hello there! I am Heather, a neurodivergent Clinical Psychologist with particular interest in neurodevelopment. My background includes private and community practice, where she has engaged in detailed assessment and diagnosis, therapeutic intervention, and collaborative care coordination.",
          "I strive to ensure that the assessment process provides warmth, safety, and supportive recommendations, valuing the individual as the expert of their own experiences. My approach is collaborative, and I often consult with paediatricians, psychiatrists, clinical psychologists, and other allied health professionals to ensure a holistic approach to understanding the individual's needs and informing support recommendations."
        ]
      }
    },
    realPerson: true
  },
  {
    id: "matthew-persello",
    name: "Matthew Persello",
    shortName: "Matthew Persello",
    gender: "undeclared",
    pronouns: "",
    profession: "psychologist",
    title: "Registered Psychologist",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/matthew-persello.jpg",
    acceptingNewPatients: true,
    focus: "Strengths-based, solution-focused therapy for adolescents and adults, with a focus on men’s mental health, neurodiversity and the LGBTQIA+ community.",
    matchLine: "Strengths-based, solution-focused therapy for adolescents and adults, with a focus on men’s mental health, neurodiversity and the LGBTQIA+ community.",
    fitSignals: [
      "Teens 13+ & adults",
      "Men’s mental health",
      "LGBTQIA+"
    ],
    practicalSignals: [
      "$240 a session, $98.95 Medicare rebate with a plan; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Matthew is a Registered Psychologist specialising in therapy for adolescents (13+ years) and adults, with a strong focus on men’s mental health, neurodiversity and the LGBTQIA+ community. He completed his psychology honours degree through studies in both Australia and the United States, including a year-long research project exploring romantic self-sabotage within gender and sexually diverse populations.",
    about: "Matthew is a Registered Psychologist specialising in therapy for adolescents (13+ years) and adults, with a strong focus on men’s mental health, neurodiversity and the LGBTQIA+ community. He completed his psychology honours degree through studies in both Australia and the United States, including a year-long research project exploring romantic self-sabotage within gender and sexually diverse populations. His areas of interest include anxiety, depression and stress, sleep difficulties, neurodiversity including autism and ADHD, gender and sexual identity, self-esteem, emotional regulation and relationship challenges. His approach is strengths-based and solution-focused, drawing on CBT, ACT, Solution Focused Therapy and Motivational Interviewing tailored to each client’s needs.",
    experience: [
      "Therapy for adolescents (13+) and adults",
      "Psychology honours, studied in Australia and the United States",
      "Year-long research project on romantic self-sabotage in gender and sexually diverse populations",
      "CBT, ACT, Solution Focused Therapy and Motivational Interviewing"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "depression",
      "anxiety",
      "emotional-regulation",
      "autism-adhd",
      "sleep",
      "relationships"
    ],
    careAreasSometimes: [
      "non-medication",
      "child-adolescent-adhd"
    ],
    careEvidence: {
      "child-adolescent-adhd": "Strengths-based, solution-focused therapy for adolescents and adults, with a focus on men’s mental health, neurodiversity and the LGBTQIA+ community.",
      depression: "Anxiety, Depression, and Stress",
      anxiety: "Anxiety, Depression, and Stress",
      "emotional-regulation": "Emotional regulation difficulties",
      "autism-adhd": "His areas of interest include anxiety, depression and stress, sleep difficulties, neurodiversity including autism and ADHD, gender and sexual identity, self-esteem, emotional regulation and relationsh",
      "non-medication": "• Cognitive Behavioural Therapy (CBT)",
      sleep: "Sleep difficulties.",
      relationships: "Relationship Challenges (Individual Counselling)"
    },
    manner: [
      "motivating"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/matthew-persello",
      readOn: "2026-10-01",
      sections: {
        "Meet Matthew at a Glance": [
          "Hello, I'm Matthew! I am a Registered Psychologist specialising in therapy for adolescents (13+ years) and adults, with a strong focus on Men’s Mental Health, Neurodiversity and the LGBTQIA+ community. I completed my psychology honours degree through studies in both Australia and the United States, where I conducted a yearlong research project exploring romantic self-sabotage within gender and sexually diverse populations.",
          "Area of Interest:",
          "• Men's Mental Health",
          "• LGBTQIA+ Community",
          "• Anxiety, Depression, and Stress",
          "• Sleep difficulties",
          "• Neurodiversity (i.e. ASD, ADHD)",
          "• Gender and Sexual Identity",
          "• Self-esteem issues",
          "• Emotional regulation difficulties",
          "• Relationship Challenges (Individual Counselling)",
          "My therapeutic approach is strengths based and solution focused, drawing on evidence based techniques tailored to each client’s unique needs. These include:",
          "• Cognitive Behavioural Therapy (CBT)",
          "• Acceptance and Commitment Therapy (ACT)",
          "• Solution Focused Therapy (SFT)",
          "• Motivational Interviewing"
        ]
      }
    },
    realPerson: true
  },
  {
    id: "nzubechi-oguoma",
    name: "Nzubechi Oguoma",
    shortName: "Nzubechi Oguoma",
    gender: "undeclared",
    pronouns: "",
    profession: "psychologist",
    title: "Registered Psychologist",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/nzubechi-oguoma.jpg",
    acceptingNewPatients: true,
    focus: "Working with individuals and families from age 5 and across the lifespan, including neurodevelopmental conditions.",
    matchLine: "Working with individuals and families from age 5 and across the lifespan, including neurodevelopmental conditions.",
    fitSignals: [
      "Ages 5+",
      "Family therapy",
      "Trauma & PTSD"
    ],
    practicalSignals: [
      "$240 a session, $98.95 Medicare rebate with a plan; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Nzubechi is a Registered Psychologist with experience working with individuals and families from age 5 and across the lifespan, presenting with a range of mental health conditions as well as neurodevelopmental disorders.",
    about: "Nzubechi is a Registered Psychologist with experience working with individuals and families from age 5 and across the lifespan, presenting with a range of mental health conditions as well as neurodevelopmental disorders. Areas of interest include anxiety, depression, trauma and post-traumatic stress disorder, family therapy, relationships, self-esteem and self-development, and work-related issues. The primary evidence-based modalities used are Cognitive Behaviour Therapy, Acceptance and Commitment Therapy and Trauma-Informed Practice.",
    experience: [
      "Individuals and families from age 5 and across the lifespan",
      "Mental health conditions and neurodevelopmental disorders",
      "CBT, ACT and Trauma-Informed Practice"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "trauma-informed",
      "anxiety",
      "depression",
      "child-adolescent-adhd",
      "parenting",
      "relationships",
      "work-career"
    ],
    careAreasSometimes: [],
    careEvidence: {
      "trauma-informed": "Trauma & PTSD",
      anxiety: "Anxiety",
      depression: "Depression",
      "child-adolescent-adhd": "Ages 5+",
      parenting: "Family therapy",
      relationships: "Relationships",
      "work-career": "Work Related Issues"
    },
    manner: [
      "culturally_attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/nzubechi-oguoma",
      readOn: "2026-10-01",
      sections: {
        "Meet Nzubechi at a Glance": [
          "Hello! I am Nzubechi, a Registered Psychologist with experience working with individuals and families from age 5+ and across the lifespan presenting with a range of mental health conditions, as well as neurodevelopmental disorders.",
          "Area of Interest:",
          "• Anxiety",
          "• Depression",
          "• Trauma & Post-Traumatic Stress Disorder (PTSD)",
          "• Family Therapy",
          "• Relationships",
          "• Self-Esteem and Self-Development",
          "• Work Related Issues",
          "The primary evidenced-based modalities I utilise are:",
          "• Cognitive Behaviour Therapy (CBT)",
          "• Acceptance and Commitment Therapy (ACT)",
          "• Trauma-Informed Practice (TIP)"
        ]
      }
    },
    realPerson: true
  },
  {
    id: "canice-curtis",
    name: "Canice Curtis",
    shortName: "Canice Curtis",
    profession: "social-worker",
    gender: "man",
    pronouns: "he/him",
    title: "Mental Health Social Worker, MSW, MPaDS, BA, AASW",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/canice-curtis.jpg",
    acceptingNewPatients: true,
    focus: "A grounded, integrated and evidence-informed approach for people 15 and over, including complex trauma and ADHD.",
    matchLine: "A grounded, integrated and evidence-informed approach for people 15 and over, including complex trauma and ADHD.",
    fitSignals: [
      "Ages 15+",
      "Trauma & EMDR",
      "Men’s mental health"
    ],
    practicalSignals: [
      "$230 a session, $87.25 Medicare rebate with a plan; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Canice Curtis is a deeply attuned and compassionate Mental Health Social Worker who considers it a privilege to walk alongside clients as they navigate challenges and work towards meaningful change. His commitment to client care led colleagues to nominate him for the AASW Social Worker of the Year Award.",
    about: "Canice Curtis is a deeply attuned and compassionate Mental Health Social Worker who considers it a privilege to walk alongside clients as they navigate challenges and work towards meaningful change. His commitment to client care led colleagues to nominate him for the AASW Social Worker of the Year Award. He supports people aged 15+ experiencing complex trauma, dissociative conditions, addictions, personality disorders, bipolar disorder, ADHD, chronic pain, parenting and relationship difficulties, men’s mental health concerns, grief and loss, anxiety, depression, and the mental health impacts of climate change and natural disasters. With a background spanning international development, child protection and academia, he brings a grounded, integrated, evidence-informed approach tailored to each person. Outside the therapy room, Canice enjoys time with his young family, playing the drums, bushwalking, yoga, reading, and exploring Buddhist philosophy and mindfulness practices.",
    experience: [
      "Mental health social worker, people aged 15 and over",
      "Nominated by colleagues for the AASW Social Worker of the Year Award",
      "Background in international development, child protection and academia",
      "Trauma and EMDR, men’s mental health, and mental health after major life changes or disasters"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "trauma-informed",
      "depression",
      "anxiety",
      "complex-mental-health",
      "grief-life-change"
    ],
    careAreasSometimes: [
      "child-adolescent-adhd"
    ],
    careEvidence: {
      "trauma-informed": "A grounded, integrated and evidence-informed approach for people 15 and over, including complex trauma and ADHD.",
      depression: "He supports people aged 15+ experiencing complex trauma, dissociative conditions, addictions, personality disorders, bipolar disorder, ADHD, chronic pain, parenting and relationship difficulties, men’",
      anxiety: "He supports people aged 15+ experiencing complex trauma, dissociative conditions, addictions, personality disorders, bipolar disorder, ADHD, chronic pain, parenting and relationship difficulties, men’",
      "complex-mental-health": "He supports people aged 15+ experiencing complex trauma, dissociative conditions, addictions, personality disorders, bipolar disorder, ADHD, chronic pain, parenting and relationship difficulties, men’",
      "child-adolescent-adhd": "aged 15+",
      "grief-life-change": "Mental Health related to significant life changes or disasters"
    },
    manner: [
      "culturally_attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/canice-curtis",
      readOn: "2026-10-01",
      sections: {
        "Meet Canice at a Glance": [
          "Canice Curtis is a deeply attuned and compassionate Mental Health Social Worker who considers it a privilege to walk alongside clients as they navigate challenges and work towards meaningful change. His commitment to client care has led colleagues to nominate him for the AASW Social Worker of the Year Award.",
          "He supports people aged 15+ experiencing complex trauma, dissociative conditions, addictions, personality disorders, bipolar disorder, ADHD, chronic pain, parenting and relationship difficulties, men’s mental health concerns, grief and loss, anxiety, depression, and the mental health impacts of climate change and natural disasters.",
          "With a background spanning international development, child protection, and academia, Canice has found his home in therapeutic practice. He brings a grounded, integrated, and evidence-informed approach, tailoring treatment to each person’s needs.",
          "Outside the therapy room, Canice enjoys spending time with his young family, playing the drums, bushwalking, yoga, reading, and exploring Buddhist philosophy and mindfulness practices.",
          "Area of Interest:",
          "• Trauma and EMDR",
          "• Men’s Mental Health",
          "• Mental Health related to significant life changes or disasters"
        ]
      }
    },
    realPerson: true
  },
  {
    id: "tracey-dale",
    name: "Tracey Dale",
    shortName: "Tracey Dale",
    gender: "undeclared",
    pronouns: "",
    profession: "social-worker",
    title: "Accredited Mental Health Social Worker",
    suburb: "Graceville",
    practice: "Nurtured Thoughts Psychology",
    reach: "Clinic appointments in Graceville, Brisbane, and telehealth",
    image: "/clinicians/tracey-dale.jpg",
    acceptingNewPatients: true,
    focus: "Warm, empowering and highly personalised therapy, kept straightforward and free from unnecessary jargon.",
    matchLine: "Warm, empowering and highly personalised therapy, kept straightforward and free from unnecessary jargon.",
    fitSignals: [
      "All ages",
      "Burnout & life transitions",
      "EMDR"
    ],
    practicalSignals: [
      "$230 a session, $87.25 Medicare rebate with a plan; set and charged by the practice",
      "Telehealth"
    ],
    summary: "Tracey is an Accredited Mental Health Social Worker with over 10 years of experience in counselling, therapy and psychotherapy. She works with clients of all ages through major life transitions such as pregnancy and motherhood, and challenges like anxiety, depression, burnout, trauma (including complex PTSD using EMDR), grief, sleep difficulties, disordered eating, and recovery from violence or substance use.",
    about: "Tracey is an Accredited Mental Health Social Worker with over 10 years of experience in counselling, therapy and psychotherapy. She works with clients of all ages through major life transitions such as pregnancy and motherhood, and challenges like anxiety, depression, burnout, trauma (including complex PTSD using EMDR), grief, sleep difficulties, disordered eating, and recovery from violence or substance use. She has provided counselling at QUT, worked in private practice and led clinical operations in busy mental health settings, including crisis support services. Clients often describe her approach as warm, empowering and highly personalised; she draws on CBT, ACT, DBT, EMDR and Narrative Therapy, tailoring each session and keeping things straightforward. The first session is about getting to know you, your story and what you would like to achieve, and she aims for you to leave each session with practical skills to take into everyday life. Outside therapy she reads, gardens, hikes, and tries her hand at pottery on a throwing wheel.",
    experience: [
      "Over 10 years in counselling, therapy and psychotherapy",
      "Counsellor, Queensland University of Technology",
      "Private practice, and clinical operations lead in mental health and crisis support services",
      "CBT, ACT, DBT, EMDR, Narrative Therapy and individual psychotherapy"
    ],
    languages: [
      "English"
    ],
    careAreas: [
      "depression",
      "anxiety",
      "trauma-informed",
      "substance-history",
      "non-medication",
      "grief-life-change"
    ],
    careAreasSometimes: [
      "child-adolescent-adhd",
      "perinatal",
      "complex-mental-health",
      "sleep",
      "eating-body"
    ],
    careEvidence: {
      depression: "Tracey is an Accredited Mental Health Social Worker with over 10 years of experience in counselling, therapy and psychotherapy. She works with clients of all ages through major life transitions such a",
      anxiety: "Tracey is an Accredited Mental Health Social Worker with over 10 years of experience in counselling, therapy and psychotherapy. She works with clients of all ages through major life transitions such a",
      "trauma-informed": "Tracey is an Accredited Mental Health Social Worker with over 10 years of experience in counselling, therapy and psychotherapy. She works with clients of all ages through major life transitions such a",
      "substance-history": "Tracey is an Accredited Mental Health Social Worker with over 10 years of experience in counselling, therapy and psychotherapy. She works with clients of all ages through major life transitions such a",
      "non-medication": "Clients often describe my approach as warm, empowering, and highly personalised. I use practical, evidence based methods including Individual Psychotherapy, Cognitive Behavioural Therapy (CBT), Accept",
      "child-adolescent-adhd": "clients of all ages",
      "grief-life-change": "Burnout & life transitions.",
      perinatal: "pregnancy and motherhood",
      "complex-mental-health": "complex PTSD",
      sleep: "sleep difficulties",
      "eating-body": "disordered eating"
    },
    manner: [
      "attuned",
      "non_judgmental",
      "culturally_attuned"
    ],
    wheelchairAccessible: false,
    appointmentLength: "Clinicians see people Monday to Saturday, with evenings Monday to Wednesday; times set with the practice",
    telehealthFirstAppointment: true,
    booking: {
      via: "practice",
      url: "https://www.nurturedthoughtspsychology.com.au/contact",
      note: "Nurtured Thoughts Psychology books by phone, (07) 3056 0921, or its online enquiry form."
    },
    profileDetail: {
      sourceUrl: "https://www.nurturedthoughtspsychology.com.au/practitioners/tracey-dale",
      readOn: "2026-10-01",
      sections: {
        "Meet Tracey at a Glance": [
          "Hello! I’m Tracey, an Accredited Mental Health Social Worker with over 10 years of experience in counselling, therapy, and psychotherapy. I work with clients of all ages, supporting them through major life transitions such as pregnancy and motherhood, as well as challenges like anxiety, depression, burnout, trauma (including complex PTSD using EMDR therapy), grief, sleep difficulties, disordered eating, and recovery from violence or substance use.",
          "In the past, I’ve provided counselling at QUT, where I supported students of all ages using focused psychological strategies to improve their mental health. I’ve also worked in private practice and led clinical operations in busy mental health settings, including crisis support services. These experiences have given me a deep understanding of the pressures and complexities people face in today’s fast paced world.",
          "Clients often describe my approach as warm, empowering, and highly personalised. I use practical, evidence based methods including Individual Psychotherapy, Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT), Dialectical Behaviour Therapy (DBT), EMDR, and Narrative Therapy. I tailor each session to your unique needs. Keeping things straightforward and free from unnecessary jargon.",
          "Outside of therapy, I strongly believe in the value of connection, balance, and self-care principles, I actively encourage in the lives of the people I work with."
        ],
        "Getting to Know Tracey a Bit Better: What’s something small that always brings you comfort or joy?": "Playing with my grandsons and preparing food for my family.",
        "Getting to Know Tracey a Bit Better: Where did you grow up, and how has that shaped who you are today?": "I moved around a lot as a child and now call Brisbane home. It helped me to build resilience, and contributed to me being adaptable, and to making friends easily.",
        "Getting to Know Tracey a Bit Better: What music or artist always lifts your mood?": "I love all types of music! Listening to music is a real passion of mine. I love electronica, house, rap, soul, blues, country and classical to name a few.",
        "Getting to Know Tracey a Bit Better: What hobbies or activities help you feel most grounded?": "Reading, listening to music, gardening and hiking.",
        "Getting to Know Tracey a Bit Better: If you could visit anywhere in the world tomorrow, where would you go and why?": "Paris, for the flea markets, art, history, culture and the romance of the city.",
        "Getting to Know Tracey a Bit Better: What’s a hidden skill or interest you have that people might be surprised to learn about?": "I do pottery, I try to make pots on a throwing wheel. I mostly fail, but I love it anyway.",
        "Getting to Know Tracey a Bit Better: What’s your favourite way to unwind after a long day?": "I am a TV  addict! I love a good series, documentary or podcast.",
        "Getting to Know Tracey a Bit Better: What do you enjoy most about being a therapist?": "The opportunity to help people, often at vulnerable times in their lives is a privilege. It is a humbling experience to be able to share people’s stories and challenges, and to work alongside them to improve their lives.",
        "Getting to Know Tracey a Bit Better: What are three words your clients often use to describe working with you?": "Warm, person-centred, effective.",
        "Getting to Know Tracey a Bit Better: How do you stay current with new research, while balancing it with real world client needs?": "I am committed to my professional development and ongoing learning as a therapist. I obtain external clinical supervision, and I am responsible for my ongoing learning to meet my professional registration as an Accredited Mental Health Social Worker. I love new ideas and am always open to new training opportunities!",
        "Getting to Know Tracey a Bit Better: How do you tailor your approach to support each client’s unique goals and challenges?": "I use a range of counselling techniques; these are often referred to as Focussed Psychological Strategies. This allows us to be able to shape our sessions to your particular needs and goals. I also bring a wealth of personal and work experience that can assist me to connect to people, develop rapport and be able to build a strong therapeutic relationship.",
        "Getting to Know Tracey a Bit Better: What can someone expect during their first session with you, and how do you help make it feel welcoming?": "The first session is about getting to know you, your unique story and what you would like to achieve in therapy. I always try to ensure that at the end of each session you have some practical skills and learnings to take with you in your everyday life.",
        "Getting to Know Tracey a Bit Better: What’s one piece of advice you often find yourself sharing with clients?": "The quality of our lives is often determined by the quality of our thoughts and relationships. Our connections with each other, and importantly with ourselves, can have a transformative impact for people.",
        "Getting to Know Tracey a Bit Better: How would you describe your therapy style in a few words?": "I bring a strengths based approach, and I hope that a sense of kindness and warmth underpins my practice. I am engaged, personal, tailored and goal oriented with a focus on research based treatment, leading to positive outcomes for clients."
      }
    },
    realPerson: true
  },
];
