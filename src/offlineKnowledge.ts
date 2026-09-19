export interface ChapterData {
  id: string;
  subject: string;
  grade: string;
  title: string;
  category: 'Physics' | 'Chemistry' | 'Biology' | 'Mathematics' | 'Social Science' | 'Poem' | 'Computer Science';
  summary: string;
  keyPoints: string[];
  qa: Array<{ question: string; answer: string }>;
}

export const OFFLINE_KNOWLEDGE_BASE: ChapterData[] = [
  // POEMS
  {
    id: 'poem-01',
    subject: 'English Literature',
    grade: 'Class 9-10',
    title: 'The Road Not Taken - Robert Frost',
    category: 'Poem',
    summary: 'Two roads diverged in a yellow wood. The speaker deliberates on choices in life, knowing that one choice leads to another and shapes destiny. It explores individuality, decision-making, and looking back with reflection.',
    keyPoints: [
      'Central metaphor: Fork in the road represents pivotal choices in life.',
      'Rhyme scheme: ABAAB across four stanzas.',
      'Theme: Choosing the less traveled road "has made all the difference".'
    ],
    qa: [
      { question: 'What does the fork in the road symbolize in the poem?', answer: 'The fork symbolizes choices, dilemmas, and irreversible decisions that individuals face in life.' },
      { question: 'Why did the poet choose the other road?', answer: 'The poet chose the other road because it was grassy and wanted wear, representing a path of novelty, courage, and independent thought.' }
    ]
  },
  {
    id: 'poem-02',
    subject: 'English Literature',
    grade: 'Class 9-10',
    title: 'Where the Mind is Without Fear - Rabindranath Tagore',
    category: 'Poem',
    summary: 'Tagore envisions a free, enlightened India where knowledge is free, truth reigns supreme, minds are fearless, and narrow domestic walls of prejudice and division do not fragment humanity.',
    keyPoints: [
      'Written in Gitanjali; prayer to the Almighty for national and spiritual awakening.',
      'Metaphor of clear stream of reason vs dreary desert sand of dead habit.',
      'Calls for tireless striving towards perfection.'
    ],
    qa: [
      { question: 'What does "narrow domestic walls" refer to?', answer: 'It refers to barriers created by caste, religion, creed, region, language, and social prejudices that divide society.' },
      { question: 'What is the poet\'s ultimate vision for his country?', answer: 'An "heaven of freedom" where citizens are fearless, pursue truth and reason, and work with dignity and open minds.' }
    ]
  },
  {
    id: 'poem-03',
    subject: 'Hindi Literature',
    grade: 'Class 9-10',
    title: 'कोशिश करने वालों की कभी हार नहीं होती (Koshish Karne Walon Ki Haar Nahi Hoti)',
    category: 'Poem',
    summary: 'A celebrated poem of resilience and perseverance. Like an ant climbing a wall with grains of corn and slipping ten times before succeeding, true victory belongs to those who never surrender to failure.',
    keyPoints: [
      'Themes: Undaunted determination, embracing failure as a lesson, persistence.',
      'Famous imagery: The ant (cheenti), the diver (gotakhor) diving into deep waters.',
      'Mantra: "Asafalta ek chunauti hai, ise sweekar karo. Kya kami reh gayi, dekho aur sudhaar karo."'
    ],
    qa: [
      { question: 'कवि ने असफलता के विषय में क्या संदेश दिया है?', answer: 'कवि के अनुसार असफलता एक चुनौती है। हमें इसमें अपनी कमियों को पहचानकर सुधार करना चाहिए और बिना हिम्मत हारे पुनः प्रयास करना चाहिए।' }
    ]
  },

  // SCIENCE: PHYSICS
  {
    id: 'phy-01',
    subject: 'Science - Physics',
    grade: 'Class 9',
    title: 'Motion: Velocity, Acceleration & Equations of Motion',
    category: 'Physics',
    summary: 'Motion describes change in position over time. Distinguishes distance (scalar) from displacement (vector), speed from velocity, and defines uniform/non-uniform acceleration. Details the 3 kinematic equations of motion.',
    keyPoints: [
      'First Equation of Motion: v = u + at',
      'Second Equation of Motion: s = ut + (1/2)at²',
      'Third Equation of Motion: v² = u² + 2as',
      'Acceleration: a = (v - u) / t'
    ],
    qa: [
      { question: 'What is the difference between speed and velocity?', answer: 'Speed is a scalar quantity measuring distance per unit time, while velocity is a vector quantity measuring displacement per unit time in a specified direction.' },
      { question: 'Derive the equation v = u + at.', answer: 'Acceleration a = (v - u)/t. Multiplying both sides by t gives at = v - u. Rearranging terms yields v = u + at.' }
    ]
  },
  {
    id: 'phy-02',
    subject: 'Science - Physics',
    grade: 'Class 9',
    title: 'Force and Laws of Motion',
    category: 'Physics',
    summary: 'Explains Newton\'s three laws of motion, inertia, momentum (p = mv), impulse, and the principle of conservation of linear momentum.',
    keyPoints: [
      'Newton\'s 1st Law (Law of Inertia): Body remains at rest or uniform motion unless an external force acts.',
      'Newton\'s 2nd Law: F = dp/dt = ma (Rate of change of momentum is proportional to applied force).',
      'Newton\'s 3rd Law: For every action, there is an equal and opposite reaction.',
      'Conservation of Momentum: m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂.'
    ],
    qa: [
      { question: 'Why does a passenger jerk forward when a moving bus brakes suddenly?', answer: 'Due to inertia of motion: the lower part of the body stops with the bus while the upper body continues in forward motion.' },
      { question: 'State the mathematical formulation of Newton\'s Second Law.', answer: 'F = m × a, where F is external net force in Newtons, m is mass in kg, and a is acceleration in m/s².' }
    ]
  },
  {
    id: 'phy-03',
    subject: 'Science - Physics',
    grade: 'Class 10',
    title: 'Electricity: Ohm\'s Law, Resistance & Joule\'s Heating',
    category: 'Physics',
    summary: 'Studies electric current (I = Q/t), potential difference (V = W/Q), Ohm\'s Law, series and parallel resistor combinations, electric power, and Joule\'s heating law (H = I²Rt).',
    keyPoints: [
      'Ohm\'s Law: V = I × R at constant temperature.',
      'Resistors in Series: R_eq = R₁ + R₂ + R₃.',
      'Resistors in Parallel: 1/R_eq = 1/R₁ + 1/R₂ + 1/R₃.',
      'Electric Power: P = VI = I²R = V²/R.',
      'Joule\'s Law of Heating: Heat produced H = I²Rt Joules.'
    ],
    qa: [
      { question: 'State Ohm\'s Law and write its formula.', answer: 'Ohm\'s Law states that electric current flowing through a metallic conductor is directly proportional to potential difference across its terminals at constant temperature: V = IR.' },
      { question: 'Why are domestic electrical appliances connected in parallel instead of series?', answer: 'In parallel circuits, each appliance receives the full voltage, operates independently, and failure of one does not interrupt other appliances.' }
    ]
  },
  {
    id: 'phy-04',
    subject: 'Science - Physics',
    grade: 'Class 10',
    title: 'Light: Reflection, Refraction, Mirror & Lens Formulas',
    category: 'Physics',
    summary: 'Covers laws of reflection, spherical mirrors (concave and convex), Snell\'s Law of refraction (n = sin i / sin r), power of lens (P = 1/f in meters), and image formation.',
    keyPoints: [
      'Mirror Formula: 1/f = 1/v + 1/u',
      'Lens Formula: 1/f = 1/v - 1/u',
      'Magnification: m = -v/u (mirrors) and m = v/u (lenses)',
      'Power of a Lens: P = 1/f (in meters), measured in Dioptres (D).'
    ],
    qa: [
      { question: 'What is Snell\'s Law of refraction?', answer: 'The ratio of the sine of the angle of incidence to the sine of the angle of refraction is a constant for a given pair of media: sin(i) / sin(r) = n₂ / n₁.' },
      { question: 'Why is a concave mirror used as a shaving mirror or dentist mirror?', answer: 'When an object is held between pole and focus of a concave mirror, it forms an erect, virtual, and highly magnified image.' }
    ]
  },

  // SCIENCE: CHEMISTRY
  {
    id: 'chem-01',
    subject: 'Science - Chemistry',
    grade: 'Class 10',
    title: 'Chemical Reactions, Balancing & Types',
    category: 'Chemistry',
    summary: 'Explains indications of chemical change, balancing equations via law of conservation of mass, and the 5 primary reaction classes: Combination, Decomposition, Displacement, Double Displacement, and Redox reactions.',
    keyPoints: [
      'Law of Conservation of Mass: Total mass of reactants equals total mass of products.',
      'Endothermic (absorbs heat) vs Exothermic (releases heat).',
      'Redox: Oxidation is loss of electrons/addition of oxygen; Reduction is gain of electrons/removal of oxygen.',
      'Corrosion and Rancidity prevention methods (galvanization, nitrogen flushing).'
    ],
    qa: [
      { question: 'Why should a magnesium ribbon be cleaned before burning in air?', answer: 'To remove the protective layer of basic magnesium oxide formed by reaction with atmospheric oxygen, allowing clean burning.' },
      { question: 'What is a double displacement precipitation reaction? Give an example.', answer: 'A reaction where two compounds exchange ions to form two new compounds, one of which is insoluble (precipitate). Example: Na₂SO₄ + BaCl₂ → BaSO₄↓ (white precipitate) + 2NaCl.' }
    ]
  },
  {
    id: 'chem-02',
    subject: 'Science - Chemistry',
    grade: 'Class 10',
    title: 'Acids, Bases, Salts and pH Scale',
    category: 'Chemistry',
    summary: 'Covers Arrhenius and Bronsted concepts, pH scale (0 to 14), neutralisation reaction (Acid + Base → Salt + Water), indicators (litmus, phenolphthalein), and preparation of common salts (Baking soda, Bleaching powder, Plaster of Paris).',
    keyPoints: [
      'pH < 7 is Acidic, pH = 7 is Neutral, pH > 7 is Basic.',
      'Bleaching Powder: CaOCl₂ produced by action of Cl₂ on dry slaked lime Ca(OH)₂.',
      'Baking Soda: Sodium hydrogen carbonate (NaHCO₃).',
      'Plaster of Paris: CaSO₄·½H₂O obtained by heating Gypsum (CaSO₄·2H₂O) at 373K.'
    ],
    qa: [
      { question: 'What is the role of tartaric acid in baking powder?', answer: 'Baking powder contains NaHCO₃ and tartaric acid. On heating, tartaric acid neutralizes the bitter-tasting sodium carbonate produced, preventing a bitter taste in cakes.' },
      { question: 'Why does tooth decay start when mouth pH is below 5.5?', answer: 'Tooth enamel (calcium hydroxyapatite) corrodes when mouth pH falls below 5.5 due to acid produced by bacteria degrading sugars.' }
    ]
  },
  {
    id: 'chem-03',
    subject: 'Science - Chemistry',
    grade: 'Class 10',
    title: 'Carbon and its Compounds: Covalent Bonds, Homologous Series',
    category: 'Chemistry',
    summary: 'Explains carbon\'s tetravalency and catenation power, allotropes (diamond, graphite, fullerenes), functional groups, homologous series, and reactions of ethanol and ethanoic acid.',
    keyPoints: [
      'Catenation: Ability of carbon to form long chains and rings with other carbon atoms.',
      'Saturated hydrocarbons (Alkanes: C_nH_{2n+2}) vs Unsaturated (Alkenes: C_nH_{2n}, Alkynes: C_nH_{2n-2}).',
      'Esterification: Ethanol + Ethanoic acid → Ethyl ethanoate (fruity smell) + Water (catalysed by H₂SO₄).',
      'Saponification: Ester + NaOH → Soap + Alcohol.'
    ],
    qa: [
      { question: 'Why does carbon form covalent compounds instead of ionic compounds?', answer: 'Carbon has 4 valence electrons. Gaining 4 electrons to form C⁴⁻ is energetically unfavorable due to nuclear charge, and losing 4 to form C⁴⁺ requires enormous ionization energy. Hence it shares electrons.' },
      { question: 'What is a homologous series? State two characteristics.', answer: 'A group of organic compounds having the same functional group, similar chemical properties, differing by a -CH₂- unit and 14u molecular mass between successive members.' }
    ]
  },

  // SCIENCE: BIOLOGY
  {
    id: 'bio-01',
    subject: 'Science - Biology',
    grade: 'Class 9-10',
    title: 'The Fundamental Unit of Life: Cell Architecture',
    category: 'Biology',
    summary: 'Explores structural and functional organization of living beings. Covers plasma membrane (osmosis/diffusion), nucleus (chromatin & DNA), mitochondria (ATP powerhouse), chloroplasts, Golgi apparatus, and lysosomes (suicide bags).',
    keyPoints: [
      'Prokaryotic (no true nucleus, 70S ribosomes) vs Eukaryotic (nuclear membrane, organelles).',
      'Mitochondria generate ATP (adenosine triphosphate) via cellular respiration.',
      'Lysosomes contain hydrolytic enzymes and degrade waste or worn-out organelles.',
      'Plant cells have cell wall (cellulose), chloroplasts, and large central vacuole.'
    ],
    qa: [
      { question: 'Why are lysosomes called suicide bags of the cell?', answer: 'When cell metabolism is disrupted or cell is damaged, lysosomes burst and their hydrolytic digestive enzymes digest their own cell.' },
      { question: 'Explain osmosis with hypertonic and hypotonic solutions.', answer: 'Osmosis is passage of water across a semipermeable membrane. In hypotonic solution, water enters and cell swells. In hypertonic solution, water leaves and cell shrinks (plasmolysis).' }
    ]
  },
  {
    id: 'bio-02',
    subject: 'Science - Biology',
    grade: 'Class 10',
    title: 'Life Processes: Nutrition, Respiration & Circulation',
    category: 'Biology',
    summary: 'Details autotrophic photosynthesis (light and dark reactions), human digestion (mouth to intestine with enzymes like pepsin, trypsin, lipase), aerobic vs anaerobic respiration, and double circulation via the 4-chambered human heart.',
    keyPoints: [
      'Photosynthesis Equation: 6CO₂ + 6H₂O + Sunlight → C₆H₁₂O₆ + 6O₂.',
      'Double Circulation: Pulmonary circulation (heart-lungs) and Systemic circulation (heart-body).',
      'Excretion: Nephrons in kidneys filter blood, reabsorbing glucose, amino acids, salts, and water.',
      'Anaerobic Respiration in muscles produces Lactic Acid, causing cramps.'
    ],
    qa: [
      { question: 'Why is double circulation necessary in birds and mammals?', answer: 'Double circulation keeps oxygenated and deoxygenated blood strictly separate, ensuring high oxygen delivery to meet high metabolic and constant body temperature maintenance needs.' },
      { question: 'What is the function of bile juice in digestion?', answer: 'Bile juice (from liver) makes the acidic food alkaline for pancreatic enzymes to act and emulsifies large fat globules into tiny droplets for efficient lipase action.' }
    ]
  },

  // MATHEMATICS
  {
    id: 'math-01',
    subject: 'Mathematics',
    grade: 'Class 9-10',
    title: 'Quadratic Equations & Arithmetic Progressions',
    category: 'Mathematics',
    summary: 'Comprehensive methods to solve ax² + bx + c = 0 via factoring, completing square, and quadratic formula. Discriminant nature of roots (D = b² - 4ac). Arithmetic progression nth term (a_n = a + (n-1)d) and sum of n terms S_n.',
    keyPoints: [
      'Quadratic Formula: x = (-b ± √(b² - 4ac)) / (2a).',
      'Discriminant D = b² - 4ac: D > 0 (two distinct real roots), D = 0 (two equal real roots), D < 0 (no real roots).',
      'AP nth term: a_n = a + (n - 1)d.',
      'AP Sum of n terms: S_n = (n/2)[2a + (n - 1)d] or S_n = (n/2)[a + l].'
    ],
    qa: [
      { question: 'Find the roots of 2x² - 7x + 3 = 0 using the quadratic formula.', answer: 'a=2, b=-7, c=3. Discriminant D = (-7)² - 4(2)(3) = 49 - 24 = 25. x = (7 ± √25)/(4) = (7 ± 5)/4. Roots are x = 3 and x = 1/2.' },
      { question: 'Find the 20th term of the AP: 3, 7, 11, 15, ...', answer: 'First term a = 3, common difference d = 7 - 3 = 4. a₂₀ = a + 19d = 3 + 19(4) = 3 + 76 = 79.' }
    ]
  },
  {
    id: 'math-02',
    subject: 'Mathematics',
    grade: 'Class 10',
    title: 'Trigonometry & Heights and Distances',
    category: 'Mathematics',
    summary: 'Ratios (sin, cos, tan, cosec, sec, cot) in a right triangle. Trigonometric identities (sin²θ + cos²θ = 1, 1 + tan²θ = sec²θ). Applications in angles of elevation and depression.',
    keyPoints: [
      'Standard Values: sin 30° = 1/2, cos 30° = √3/2, tan 45° = 1, sin 60° = √3/2, cos 60° = 1/2.',
      'Fundamental Identity: sin²θ + cos²θ = 1.',
      'Identity 2: 1 + tan²θ = sec²θ.',
      'Identity 3: 1 + cot²θ = cosec²θ.'
    ],
    qa: [
      { question: 'A tower stands vertically on ground. From a point 15m away from its foot, the angle of elevation of top is 60°. Find tower height.', answer: 'tan 60° = Height / Distance. √3 = h / 15. Therefore, h = 15√3 meters ≈ 25.98 meters.' }
    ]
  },

  // SOCIAL SCIENCE & SIH INNOVATION
  {
    id: 'sst-01',
    subject: 'Social Science',
    grade: 'Class 10',
    title: 'Nationalism in India & Democratic Governance',
    category: 'Social Science',
    summary: 'Covers the First World War impact, Satyagraha concept by Mahatma Gandhi, Rowlatt Act, Jallianwala Bagh massacre, Non-Cooperation Movement, Civil Disobedience, and Salt March to Dandi.',
    keyPoints: [
      'Champaran (1917), Kheda (1917), and Ahmedabad Cotton Mill (1918) early Satyagrahas.',
      'Rowlatt Act (1919) authorized detention without trial.',
      'Dandi Salt March: Started 12 March 1930 from Sabarmati to Dandi (240 miles) marking launch of Civil Disobedience.',
      'Poona Pact (1932) between Dr. B.R. Ambedkar and Mahatma Gandhi on reserved seats.'
    ],
    qa: [
      { question: 'Why did Mahatma Gandhi decide to withdraw the Non-Cooperation Movement in 1922?', answer: 'Because of the violent Chauri Chaura incident in Gorakhpur in February 1922 where protesters set fire to a police station, violating the principle of non-violence.' },
      { question: 'What was the significance of the Dandi Salt March?', answer: 'It transformed Indian nationalism into a mass movement by targeting salt, a universal necessity, and openly defied the British salt tax monopoly.' }
    ]
  },

  // COMPUTER SCIENCE & AI
  {
    id: 'cs-01',
    subject: 'Artificial Intelligence & Robotics',
    grade: 'Junior / Senior',
    title: 'Edge AI, Machine Control & Autonomous Agents for SIH 2026',
    category: 'Computer Science',
    summary: 'Fundamentals of building edge-resilient AI assistants for Smart India Hackathon. Covers local inference vs cloud routing, wake-word event listeners, hardware process controller commands, vision OCR pipelines, and multi-model failover.',
    keyPoints: [
      'Edge AI Architecture: Hybrid execution allowing zero-latency offline response with cloud model escalation.',
      'Process Control: One-click Start/Stop lifecycle manager for IoT nodes, sensors, and operating system processes.',
      'Computer Vision OCR: Base64 image payload processing with spatial bounding and semantic comprehension.',
      'Wake-Word Engine: Continuous low-power audio streaming with acoustic pattern matching ("Okay Magic").'
    ],
    qa: [
      { question: 'How does Blackmagic AI guarantee offline resilience in rural schools?', answer: 'By storing an offline curriculum knowledge base and local lightweight heuristic neural synthesizer that answers questions even when the internet is completely severed.' },
      { question: 'What is the one-command run/stop mechanism?', answer: 'An asynchronous process supervisor that initializes or halts distributed neural services, telemetry collectors, and device controllers with a single command.' }
    ]
  }
];

export function searchOfflineKnowledge(query: string): { matches: ChapterData[]; exactMatch?: string } {
  if (!query || query.trim() === '') return { matches: [] };

  const q = query.toLowerCase().trim();
  const stopWords = new Set([
    'the', 'and', 'are', 'was', 'were', 'for', 'with', 'that', 'this', 'from',
    'they', 'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'how', 'did',
    'does', 'not', 'can', 'could', 'would', 'should', 'all', 'any', 'each', 'few',
    'more', 'most', 'some', 'such', 'nor', 'too', 'very', 'tell', 'give', 'about',
    'please', 'write', 'explain', 'detail', 'current', 'office', 'take'
  ]);
  const words = q.split(/[^a-zA-Z0-9_\u0900-\u097F]+/).filter(w => w.length > 2 && !stopWords.has(w));
  if (words.length === 0) return { matches: [] };

  // Score each chapter
  const scored = OFFLINE_KNOWLEDGE_BASE.map(item => {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const summaryLower = item.summary.toLowerCase();
    const categoryLower = item.category.toLowerCase();
    const subjectLower = item.subject.toLowerCase();

    if (titleLower.includes(q)) score += 20;
    if (categoryLower.includes(q)) score += 8;
    if (subjectLower.includes(q)) score += 8;

    for (const word of words) {
      if (titleLower.includes(word)) score += 8;
      if (categoryLower.includes(word)) score += 4;
      if (subjectLower.includes(word)) score += 4;
      if (summaryLower.includes(word)) score += 2;
      for (const qa of item.qa) {
        if (qa.question.toLowerCase().includes(word)) score += 4;
        if (qa.answer.toLowerCase().includes(word)) score += 2;
      }
      for (const kp of item.keyPoints) {
        if (kp.toLowerCase().includes(word)) score += 2;
      }
    }

    return { item, score };
  });

  // Only consider strong matches (score >= 12)
  const matches = scored
    .filter(s => s.score >= 12)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);

  return {
    matches: matches
  };
}
